import { mkdir, readFile, access, rm, writeFile, chown } from 'node:fs/promises'
import net, { connect } from 'node:net'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { extract } from 'tar'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { env } from './env.js'
import path from 'node:path'
import { exec as execSync, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execSync)
const supabaseUrl = env.SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
const s3fsMount = env.S3FS_MOUNT
const wildcardDomain = env.WILDCARD_DOMAIN

const dumpDir = `${s3fsMount}/dbs`
const tlsDir = `${s3fsMount}/tls`

await mkdir(dumpDir, { recursive: true })
await mkdir(env.CACHE_PATH, { recursive: true })
await mkdir(tlsDir, { recursive: true })

const tls: TlsOptions = {
  key: await readFile(`${tlsDir}/key.pem`),
  cert: await readFile(`${tlsDir}/cert.pem`),
}

function getIdFromServerName(serverName: string) {
  // The left-most subdomain contains the ID
  // ie. 12345.db.example.com -> 12345
  const [id] = serverName.split('.')
  return id
}

const PostgresErrorCodes = {
  ConnectionException: '08000',
} as const

function sendFatalError(connection: PostgresConnection, code: string, message: string): Error {
  connection.sendError({
    severity: 'FATAL',
    code,
    message,
  })
  connection.socket.end()
  return new Error(message)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

const server = net.createServer((socket) => {
  const connection = new PostgresConnection(socket, {
    auth: {
      method: 'scram-sha-256',
      async getScramSha256Data(_, { tlsInfo }) {
        if (!tlsInfo?.sniServerName) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            'sniServerName required in TLS info'
          )
        }

        const databaseId = getIdFromServerName(tlsInfo.sniServerName)
        const { data, error } = await supabase
          .from('deployed_databases')
          .select('auth_method, auth_data')
          .eq('database_id', databaseId)
          .single()

        if (error) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Error getting auth data for database ${databaseId}`
          )
        }

        if (data === null) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Database ${databaseId} not found`
          )
        }

        if (data.auth_method !== 'scram-sha-256') {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Unsupported auth method for database ${databaseId}: ${data.auth_method}`
          )
        }

        return data.auth_data as ScramSha256Data
      },
    },
    tls,
    async onTlsUpgrade({ tlsInfo }) {
      if (!tlsInfo?.sniServerName) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `ssl sni extension required`,
        })
        connection.socket.end()
        return
      }

      if (!tlsInfo.sniServerName.endsWith(wildcardDomain)) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `unknown server ${tlsInfo.sniServerName}`,
        })
        connection.socket.end()
        return
      }
    },
    async onAuthenticated({ tlsInfo }) {
      // at this point we know sniServerName is set
      const databaseId = getIdFromServerName(tlsInfo!.sniServerName!)

      console.log(`Serving database '${databaseId}'`)

      const dbPath = path.join(env.CACHE_PATH, databaseId)

      if (!(await fileExists(dbPath))) {
        console.log(`Database '${databaseId}' is not cached, downloading...`)

        const dumpPath = path.join(dumpDir, `${databaseId}.tar.gz`)

        if (!(await fileExists(dumpPath))) {
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `database ${databaseId} not found`,
          })
          connection.socket.end()
          return
        }

        // Create a directory for the database
        await mkdir(dbPath, { recursive: true })

        try {
          // Extract the .tar.gz file
          await pipeline(createReadStream(dumpPath), createGunzip(), extract({ cwd: dbPath }))
        } catch (error) {
          console.error(error)
          await rm(dbPath, { recursive: true, force: true }) // Clean up the partially created directory
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `Error extracting database: ${(error as Error).message}`,
          })
          connection.socket.end()
          return
        }

        // delete postmaster.pid
        await rm(path.join(dbPath, 'postmaster.pid'))

        // replace postgresql.conf and pg_hba.conf
        const postgresConf = `
          listen_addresses = ''
          unix_socket_directories = '${dbPath}'
          shared_buffers = 4MB
          work_mem = 64kB
          maintenance_work_mem = 1MB
          max_connections = 10
          max_wal_senders = 0
          wal_level = minimal
          fsync = off
          synchronous_commit = off
          full_page_writes = off
          wal_buffers = 32kB
          autovacuum = off
          max_worker_processes = 2
          max_parallel_workers_per_gather = 0
          max_parallel_workers = 0
          max_parallel_maintenance_workers = 0
          logging_collector = off
          log_min_duration_statement = -1
          log_statement = 'none'
          log_connections = off
          log_disconnections = off
        `
        const pgHbaConf = `
        local   all   all   trust
        `
        await writeFile(path.join(dbPath, 'postgresql.conf'), postgresConf)
        await writeFile(path.join(dbPath, 'pg_hba.conf'), pgHbaConf)

        // give ownership to postgres using exec
        await exec(`chown -R postgres:postgres ${dbPath}`)

        // set permissions to 700 on the data directory
        await exec(`chmod -R 700 ${dbPath}`)
      }

      // Call pg_ctl and wait for it to be ready
      const dataDir = path.join(dbPath, 'data')

      console.log(`Starting PostgreSQL for database '${databaseId}'`)

      // prettier-ignore
      const startProcess = spawn('su-exec', ['postgres',
        'pg_ctl', 'start',
        '-D', dataDir,
        '-w'
      ])

      await new Promise<void>((resolve, reject) => {
        startProcess.on('exit', (code) => {
          if (code === 0) {
            console.log(`PostgreSQL started successfully for database '${databaseId}'`)
            resolve()
          } else {
            reject(
              new Error(
                `Failed to start PostgreSQL for database '${databaseId}'. Exit code: ${code}`
              )
            )
          }
        })

        startProcess.on('error', (err) => {
          reject(
            new Error(`Error starting PostgreSQL for database '${databaseId}': ${err.message}`)
          )
        })
      })

      // Wait for PostgreSQL to be ready using pg_isready
      const isReadyProcess = spawn('su-exec', ['postgres', 'pg_isready', '-U', 'postgres'])

      await new Promise<void>((resolve, reject) => {
        isReadyProcess.on('exit', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`pg_isready failed with code ${code}`))
          }
        })
      })

      // Establish a TCP connection to the downstream server using the above host/port
      const proxySocket = connect({ path: path.join(socketDir, '.s.PGSQL.5432') })

      // Detach from the `PostgresConnection` to prevent further buffering/processing
      const socket = connection.detach()
      const user = 'postgres' // or whatever user you want to connect as
      // prettier-ignore
      const startupMessage = Buffer.from([
        0, 0, 0, 0, // Length placeholder
        3, 0, 0, 0, // Protocol version 3.0
        ...Buffer.from('user\0'), // "user" parameter name
        ...Buffer.from(user + '\0'), // user value
        0, // Null terminator
      ])

      // Set the correct length in the message header
      startupMessage.writeInt32BE(startupMessage.length, 0)

      // Send the startup message to the proxy socket
      proxySocket.write(startupMessage)

      // Wait for the "ready for query" message from the downstream server
      await new Promise<void>((resolve, reject) => {
        const onData = (data: Buffer) => {
          // Check if the message is "ready for query" (ASCII 'Z')
          if (data[0] === 90) {
            proxySocket.removeListener('data', onData)
            proxySocket.removeListener('error', onError)
            resolve()
          }
        }

        const onError = (err: Error) => {
          proxySocket.removeListener('data', onData)
          proxySocket.removeListener('error', onError)
          reject(err)
        }

        proxySocket.on('data', onData)
        proxySocket.on('error', onError)
      })

      // Pipe data directly between sockets
      proxySocket.pipe(socket, { end: true })
      socket.pipe(proxySocket, { end: true })

      // Handle errors and close events
      function destroyBoth(err?: Error) {
        socket.destroy(err)
        proxySocket.destroy(err)
      }
      proxySocket.on('error', destroyBoth)
      socket.on('error', destroyBoth)
      proxySocket.on('close', destroyBoth)
      socket.on('close', destroyBoth)
    },
  })

  socket.on('close', async () => {
    console.log('Client disconnected')
    // TODO: stop the pg_ctl process
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

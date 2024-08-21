import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { mkdir, readFile, access, rm } from 'node:fs/promises'
import net from 'node:net'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { extract } from 'tar'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { findUp } from 'find-up'
import { env } from './env.js'
import { deleteCache } from './delete-cache.js'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import util from 'node:util'
import { exec as execSync } from 'node:child_process'

const exec = util.promisify(execSync)

const supabaseUrl = env.SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
const s3fsMount = env.S3FS_MOUNT
const wildcardDomain = env.WILDCARD_DOMAIN

const packageLockJsonPath = await findUp('package-lock.json')
if (!packageLockJsonPath) {
  throw new Error('package-lock.json not found')
}
const packageLockJson = JSON.parse(await readFile(packageLockJsonPath, 'utf8')) as {
  packages: {
    'node_modules/@electric-sql/pglite': {
      version: string
    }
  }
}
const pgliteVersion = `(PGlite ${packageLockJson.packages['node_modules/@electric-sql/pglite'].version})`

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
  let db: PGliteInterface
  let databaseId: string | undefined
  const connectionId = randomUUID()

  console.log(`New connection ${connectionId}`)

  // deleteCache().catch((err) => {
  //   console.error(`Error deleting cache: ${err}`)
  // })

  const connection = new PostgresConnection(socket, {
    serverVersion: async () => {
      const {
        rows: [{ version }],
      } = await db.query<{ version: string }>(
        `select current_setting('server_version') as version;`
      )
      const serverVersion = `${version} ${pgliteVersion}`

      return serverVersion
    },
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

        databaseId = getIdFromServerName(tlsInfo.sniServerName)

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

      try {
        const dbPath = await initializePgData({ databaseId, connectionId })
        db = await initializePGlite({ dbPath })
        console.log(
          `PGlite instance ready for database ${databaseId} with connection ${connectionId}`
        )
      } catch (err) {
        connection.sendError({
          severity: 'FATAL',
          code: 'XX000',
          message: (err as Error).message,
        })
        connection.socket.end()
      }
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false
      }

      // Forward raw message to PGlite
      try {
        const responseData = await db.execProtocolRaw(data)
        connection.sendData(responseData)
      } catch (err) {
        console.error(err)
      }
      return true
    },
  })

  socket.on('close', async () => {
    console.log(`Connection ${connectionId} closed`)
    await db?.close()
    if (databaseId) {
      await cleanupPgdata({ databaseId, connectionId })
    }
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

/**
 * Initialize a PGDATA folder usable for a dedicated PGlite instance
 */
async function initializePgData(params: { databaseId: string; connectionId: string }) {
  const databaseRootPath = path.join(env.CACHE_PATH, params.databaseId)

  const lowPath = await initializeBasePgData({
    databaseId: params.databaseId,
    databaseRootPath,
  })

  const connectionRootPath = path.join(databaseRootPath, 'connections', params.connectionId)
  await mkdir(connectionRootPath, { recursive: true })

  // trick to make it works in Docker: https://stackoverflow.com/a/67208735
  let overlayPath = connectionRootPath
  if (env.DOCKER_RUNTIME) {
    const overlayPath = path.join(connectionRootPath, 'overlay')
    await mkdir(overlayPath)
    await exec(`mount -t tmpfs tmpfs ${overlayPath}`)
  }

  const upPath = path.join(overlayPath, 'up')
  const workPath = path.join(overlayPath, 'work')

  const mergedPath = path.join(connectionRootPath, 'merged')

  await Promise.all([mkdir(upPath), mkdir(workPath), mkdir(mergedPath)])

  await exec(
    `mount -t overlay overlay -o lowerdir=${lowPath},upperdir=${upPath},workdir=${workPath} ${mergedPath}`
  )

  return mergedPath
}

/**
 * Check if the base PGDATA exists on disk, otherwise download it and extract it
 */
async function initializeBasePgData(params: { databaseId: string; databaseRootPath: string }) {
  const basePath = path.join(params.databaseRootPath, 'pgdata')

  if (await fileExists(basePath)) {
    return basePath
  }

  console.log(`Downloading PGDATA for database ${params.databaseId}...`)

  const dumpPath = path.join(dumpDir, `${params.databaseId}.tar.gz`)

  if (!(await fileExists(dumpPath))) {
    throw new Error(`database ${params.databaseId} not found`)
  }

  // Create a directory for the database
  await mkdir(basePath, { recursive: true })

  try {
    // Extract the .tar.gz file
    await pipeline(createReadStream(dumpPath), createGunzip(), extract({ cwd: basePath }))
  } catch (error) {
    // Clean up the partially created directory
    await rm(basePath, { recursive: true, force: true })
    throw new Error(`Error extracting database ${params.databaseId}`)
  }

  console.log(`PGDATA for database ${params.databaseId} downloaded and extracted`)

  return basePath
}

async function initializePGlite(params: { dbPath: string }) {
  let db = new PGlite({
    dataDir: params.dbPath,
    extensions: {
      vector,
    },
  })
  await db.waitReady
  const { rows } = await db.query("SELECT 1 FROM pg_roles WHERE rolname = 'readonly_postgres';")
  if (rows.length === 0) {
    await db.exec(`
      CREATE USER readonly_postgres;
      GRANT pg_read_all_data TO readonly_postgres;
    `)
  }
  await db.close()
  db = new PGlite({
    dataDir: params.dbPath,
    username: 'readonly_postgres',
    extensions: {
      vector,
    },
  })
  await db.waitReady

  return db
}

async function cleanupPgdata(params: { databaseId: string; connectionId: string }) {
  const databaseRootPath = path.join(env.CACHE_PATH, params.databaseId)

  const connectionRootPath = path.join(databaseRootPath, 'connections', params.connectionId)

  if (!(await fileExists(connectionRootPath))) {
    return
  }

  const mergedPath = path.join(connectionRootPath, 'merged')

  await exec(`umount ${mergedPath}`).catch(() => {})

  // trick to make it works in Docker: https://stackoverflow.com/a/67208735
  if (env.DOCKER_RUNTIME) {
    const overlayPath = path.join(connectionRootPath, 'overlay')
    await exec(`umount ${overlayPath}`).catch(() => {})
  }

  await rm(connectionRootPath, { recursive: true, force: true }).catch(() => {})
}

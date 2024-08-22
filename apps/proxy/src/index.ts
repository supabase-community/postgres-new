import { readFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { File } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { env } from './env.js'
import { sendFatalError, PostgresErrorCode } from './utils.js'

const tls: TlsOptions = {
  key: await readFile(`${env.S3FS_MOUNT}/tls/key.pem`),
  cert: await readFile(`${env.S3FS_MOUNT}/tls/cert.pem`),
}

const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

let isBusy = false

const server = net.createServer((socket) => {
  if (isBusy) {
    console.log('Max connections reached, closing new connection')
    socket.end()
    return
  }
  isBusy = true
  let db: PGliteInterface | undefined
  let databaseId: string | undefined
  console.time('startup + tls upgrade')
  console.time('auth')
  const connection = new PostgresConnection(socket, {
    serverVersion: async () => {
      const {
        rows: [{ version }],
      } = await db!.query<{ version: string }>(
        `select current_setting('server_version') as version;`
      )
      const serverVersion = `${version} ${env.PGLITE_VERSION}`

      return serverVersion
    },
    auth: {
      method: 'scram-sha-256',
      async getScramSha256Data(_, { tlsInfo }) {
        if (!tlsInfo?.sniServerName) {
          throw sendFatalError(
            connection,
            PostgresErrorCode.ConnectionException,
            'sniServerName required in TLS info'
          )
        }

        const { data, error } = await supabase
          .from('deployed_databases')
          .select('auth_method, auth_data')
          .eq('database_id', databaseId!)
          .single()

        if (error) {
          throw sendFatalError(
            connection,
            PostgresErrorCode.ConnectionException,
            `Error getting auth data for database ${databaseId}`
          )
        }

        if (data === null) {
          throw sendFatalError(
            connection,
            PostgresErrorCode.ConnectionException,
            `Database ${databaseId} not found`
          )
        }

        if (data.auth_method !== 'scram-sha-256') {
          throw sendFatalError(
            connection,
            PostgresErrorCode.ConnectionException,
            `Unsupported auth method for database ${databaseId}: ${data.auth_method}`
          )
        }

        return data.auth_data as ScramSha256Data
      },
    },
    tls,
    async onTlsUpgrade({ tlsInfo }) {
      if (!tlsInfo?.sniServerName) {
        throw sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `ssl sni extension required`
        )
      }

      if (!tlsInfo.sniServerName.endsWith(env.WILDCARD_DOMAIN)) {
        throw sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `unknown server ${tlsInfo.sniServerName}`
        )
      }

      const serverNameParts = tlsInfo.sniServerName.split('.')
      // The left-most subdomain contains the database id
      databaseId = serverNameParts[0]
      console.timeEnd('startup + tls upgrade')
    },
    async onAuthenticated() {
      console.timeEnd('auth')
      console.time('Read the dump from S3')
      const buffer = await readFile(path.join(env.S3FS_MOUNT, 'dbs', `${databaseId}.tar.gz`))
      const file = new File([buffer], `${databaseId}.tar.gz`, { type: 'application/gzip' })
      console.timeEnd('Read the dump from S3')
      console.time('Create PGlite instance')
      // @ts-expect-error File
      db = new PGlite({
        loadDataDir: file,
        extensions: {
          vector,
        },
      })
      await db.waitReady
      console.timeEnd('Create PGlite instance')
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false
      }

      // Forward raw message to PGlite
      try {
        const responseData = await db!.execProtocolRaw(data)
        connection.sendData(responseData)
      } catch (err) {
        console.error(err)
      }
      return true
    },
  })

  socket.on('close', async () => {
    await db?.close()
    db = undefined
    databaseId = undefined
    isBusy = false
    if (env.FLY_APP_NAME && env.FLY_MACHINE_ID && env.FLY_API_TOKEN) {
      // suspend the machine
      fetch(
        `https://api.machines.dev/v1/apps/${env.FLY_APP_NAME}/machines/${env.FLY_MACHINE_ID}/suspend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.FLY_API_TOKEN}`,
          },
        }
      )
    }
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

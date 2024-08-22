import { readFile } from 'node:fs/promises'
import net from 'node:net'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { env } from './env.js'
import { getDatabaseIdFromHostname } from './utils.js'
import { tcpConnections, wsConnections } from './server-state.js'

const tls: TlsOptions = {
  key: await readFile(`${env.S3FS_MOUNT}/tls/key.pem`),
  cert: await readFile(`${env.S3FS_MOUNT}/tls/cert.pem`),
}

const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export const tcpServer = net.createServer((socket) => {
  let databaseId: string

  const connection = new PostgresConnection(socket, {
    serverVersion: async () => {
      // bonus, get this information from the PGlite instance in the browser
      return '16.3'
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

      databaseId = getDatabaseIdFromHostname(tlsInfo.sniServerName)
    },
    auth: {
      method: 'scram-sha-256',
      async getScramSha256Data() {
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
    async onAuthenticated() {
      console.log(`Authenticated, serving database '${databaseId}'`)

      if (tcpConnections.has(databaseId)) {
        throw sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `Database ${databaseId} already has an active connection, PGlite only runs in single-user mode`
        )
      }

      tcpConnections.set(databaseId, connection)
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false
      }

      const wsConnection = wsConnections.get(databaseId)

      if (!wsConnection) {
        throw sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `No WebSocket connection found for database ${databaseId}`
        )
      }

      wsConnection.send(data)

      return true
    },
  })

  socket.on('close', () => {
    tcpConnections.delete(databaseId)
    console.log(`PostgreSQL client disconnected for database ${databaseId}`)
  })
})

const PostgresErrorCode = {
  ConnectionException: '08000',
} as const

type PostgresErrorCode = (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode]

function sendFatalError(
  connection: PostgresConnection,
  code: PostgresErrorCode,
  message: string
): void {
  connection.sendError({
    severity: 'FATAL',
    code,
    message,
  })
  connection.socket.end()
}

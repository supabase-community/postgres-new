import net from 'node:net'
import { PostgresConnection, type ScramSha256Data } from 'pg-gateway'
import { env } from './env.ts'
import { getTlsOptions } from './utils/get-tls-options.ts'
import { getDeployedDatabase } from './utils/get-deployed-database.ts'
import { connectWithRetry } from './utils/connect-with-retry.ts'
import { PostgresErrorCode, sendFatalError } from './utils/send-fatal-error.ts'

const server = net.createServer((socket) => {
  const connection = new PostgresConnection(socket, {
    tls: getTlsOptions,
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
    },
    auth: {
      method: 'scram-sha-256',
      async getScramSha256Data(_, { tlsInfo }) {
        const serverNameParts = tlsInfo!.sniServerName!.split('.')
        // The left-most subdomain contains the database id
        const databaseId = serverNameParts.at(0)!

        const { data, error } = await getDeployedDatabase(databaseId)

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
    async onAuthenticated({ tlsInfo }) {
      const serverNameParts = tlsInfo!.sniServerName!.split('.')
      // The left-most subdomain contains the database id
      const databaseId = serverNameParts[0]

      // Create a new Fly Machine
      const machine = await fetch(
        `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.FLY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              image: `registry.fly.io/${env.WORKER_APP_NAME}:latest`,
              env: {
                DATABASE_ID: databaseId,
              },
              metadata: {
                databaseId,
              },
              guest: {
                cpu_kind: 'shared',
                cpus: 1,
                memory_mb: 512,
              },
              auto_destroy: true,
            },
          }),
        }
      ).then((res) => res.json())

      // Establish a TCP connection to the worker
      const workerSocket = await connectWithRetry(
        {
          host: machine.private_ip, //`${machine.id}.vm.${env.WORKER_APP_NAME}.internal`,
          port: 5432,
        },
        10000
      )

      // Detach from the `PostgresConnection` to prevent further buffering/processing
      const socket = connection.detach()

      // Pipe data directly between sockets
      socket.pipe(workerSocket)
      workerSocket.pipe(socket)

      socket.on('end', () => workerSocket.end())
      workerSocket.on('end', () => socket.end())

      socket.on('error', (err) => workerSocket.destroy(err))
      workerSocket.on('error', (err) => socket.destroy(err))

      socket.on('close', () => workerSocket.destroy())
      workerSocket.on('close', () => socket.destroy())
    },
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

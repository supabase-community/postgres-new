import { readFile } from 'node:fs/promises'
import net from 'node:net'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { env } from './env.js'
import { sendFatalError, PostgresErrorCode, connectWithRetry } from './utils.js'

const tls: TlsOptions = {
  key: await readFile(`${env.S3FS_MOUNT}/tls/key.pem`),
  cert: await readFile(`${env.S3FS_MOUNT}/tls/cert.pem`),
}

const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const server = net.createServer((socket) => {
  const connection = new PostgresConnection(socket, {
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

        const serverNameParts = tlsInfo.sniServerName.split('.')
        // The left-most subdomain contains the database id
        const databaseId = serverNameParts[0]

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
    },
    async onAuthenticated({ tlsInfo }) {
      const serverNameParts = tlsInfo!.sniServerName!.split('.')
      // The left-most subdomain contains the database id
      const databaseId = serverNameParts[0]

      const appName = 'postgres-new-proxy'

      // Create a new Fly Machine
      const machine = await fetch(`http://_api.internal:4280/v1/apps/${appName}/machines`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        },
        body: JSON.stringify({
          config: {
            image: 'registry.fly.dev/postgres-new-worker:latest',
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
          },
        }),
      }).then((res) => res.json())

      // Establish a TCP connection to the worker
      const workerSocket = await connectWithRetry(
        {
          host: `${machine.id}.vm.${appName}.internal`,
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

  // socket.on('close', async () => {
  //   if (env.FLY_APP_NAME && env.FLY_MACHINE_ID && env.FLY_API_TOKEN) {
  //     // suspend the machine
  //     fetch(
  //       `https://api.machines.dev/v1/apps/${env.FLY_APP_NAME}/machines/${env.FLY_MACHINE_ID}/suspend`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           Authorization: `Bearer ${env.FLY_API_TOKEN}`,
  //         },
  //       }
  //     )
  //   }
  // })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

import net from 'node:net'
import { PostgresConnection, type ScramSha256Data } from 'pg-gateway'
import { env } from './env.ts'
import { getTlsOptions } from './utils/get-tls-options.ts'
import { getDeployedDatabase } from './utils/get-deployed-database.ts'
import { connectWithRetry } from './utils/connect-with-retry.ts'
import { PostgresErrorCode, sendFatalError } from './utils/send-fatal-error.ts'
import { getMachine, stopMachine, suspendMachine } from './utils/get-machine.ts'
import { randomBytes } from 'node:crypto'

function getDatabaseId(serverName?: string) {
  // return 'fcn7kjjf6lmhfye8'
  return serverName!.split('.').at(0)!
}

const server = net.createServer((socket) => {
  const connectionId = randomBytes(16).toString('hex')
  console.time(`[${connectionId}] new connection to authenticated`)
  const connection = new PostgresConnection(socket, {
    tls: async () => {
      try {
        console.time(`[${connectionId}] get tls options`)
        const tlsOptions = await getTlsOptions()
        console.timeEnd(`[${connectionId}] get tls options`)
        return tlsOptions
      } catch (err) {
        console.error('Error in tls option callback', err)
        throw err
      }
    },
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
        const databaseId = getDatabaseId(tlsInfo?.sniServerName)

        console.time(`[${connectionId}] get deployed database infos`)
        const { data, error } = await getDeployedDatabase(databaseId)
        console.timeEnd(`[${connectionId}] get deployed database infos`)

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
      console.timeEnd(`[${connectionId}] new connection to authenticated`)
      const databaseId = getDatabaseId(tlsInfo?.sniServerName)

      // Get an available Machine
      console.time(`[${connectionId}] get machine`)
      const machine = await getMachine()
      console.timeEnd(`[${connectionId}] get machine`)

      try {
        // Establish a TCP connection to the worker
        console.time(`[${connectionId}] connect to worker ${machine.id}`)
        const workerSocket = await connectWithRetry(
          {
            host: machine.private_ip,
            port: 5432,
          },
          10000
        )
        console.timeEnd(`[${connectionId}] connect to worker ${machine.id}`)

        // send the databaseId to the worker
        workerSocket.write(databaseId!, 'utf-8')

        // wait for the worker to ack
        console.time(`[${connectionId}] wait for worker ack`)
        await new Promise<void>((res, rej) =>
          workerSocket.once('data', (data) => {
            if (data.toString('utf-8') === 'ACK') {
              res()
            } else {
              rej(new Error('Worker did not ACK'))
            }
          })
        )
        console.timeEnd(`[${connectionId}] wait for worker ack`)

        // Detach from the `PostgresConnection` to prevent further buffering/processing
        const socket = connection.detach()

        console.time(`[${connectionId}] pipe data between sockets`)
        // Pipe data directly between sockets
        socket.pipe(workerSocket)
        workerSocket.pipe(socket)

        socket.on('end', () => workerSocket.end())
        workerSocket.on('end', () => socket.end())

        socket.on('error', async (err) => {
          console.error(`[${connectionId}] socket error`, err)
          workerSocket.destroy(err)
          console.time(`[${connectionId}] suspending machine`)
          await suspendMachine(machine.id)
          console.timeEnd(`[${connectionId}] suspending machine`)
        })
        workerSocket.on('error', (err) => {
          console.error(`[${connectionId}] worker socket error`, err)
          socket.destroy(err)
        })

        socket.on('close', async () => {
          console.log(`[${connectionId}] socket close`)
          workerSocket.destroy()
          console.time(`[${connectionId}] suspending machine`)
          await suspendMachine(machine.id)
          console.timeEnd(`[${connectionId}] suspending machine`)
        })
        workerSocket.on('close', () => {
          console.log(`[${connectionId}] worker socket close`)
          socket.destroy()
        })
        console.timeEnd(`[${connectionId}] pipe data between sockets`)
      } catch (err) {
        console.error(`[${connectionId}] error during onAuthenticated`, err)
        // stop the machine as it can be in an unknown state, it will be destroyed by Fly.io
        console.time(`[${connectionId}] stopping machine`)
        await stopMachine(machine.id).catch((err: any) => {
          console.error(`[${connectionId}] error stopping machine`, err)
        })
        console.timeEnd(`[${connectionId}] stopping machine`)
        throw sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `failed to initialize connection to the database`
        )
      }
    },
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

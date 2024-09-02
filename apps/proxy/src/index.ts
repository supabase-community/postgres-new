import net from 'node:net'
import { PostgresConnection, type ScramSha256Data } from 'pg-gateway'
import { env } from './env.ts'
import { getTlsOptions } from './utils/get-tls-options.ts'
import { getDeployedDatabase } from './utils/get-deployed-database.ts'
import { connectWithRetry } from './utils/connect-with-retry.ts'
import { PostgresErrorCode, sendFatalError } from './utils/send-fatal-error.ts'
import { getMachine, suspendMachine } from './utils/get-machine.ts'

type Machine = {
  id: string
  private_ip: string
  state:
    | 'created'
    | 'starting'
    | 'started'
    | 'stopping'
    | 'stopped'
    | 'suspending'
    | 'suspended'
    | 'replacing'
    | 'destroying'
    | 'destroyed'
}

const workers = new Map<string, Machine>()

const machines = (await fetch(
  `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines?region=${env.FLY_REGION}`,
  {
    headers: {
      Authorization: `Bearer ${env.FLY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }
).then((res) => res.json())) as Array<Machine>

for (const machine of machines) {
  workers.set(machine.id, machine)
}

const server = net.createServer((socket) => {
  console.time('new connection to authenticated')
  const connection = new PostgresConnection(socket, {
    tls: async () => {
      console.time('get tls options')
      const tlsOptions = await getTlsOptions()
      console.timeEnd('get tls options')
      return tlsOptions
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
        const serverNameParts = tlsInfo!.sniServerName!.split('.')
        // The left-most subdomain contains the database id
        const databaseId = serverNameParts.at(0)!

        console.time('get deployed database infos')
        const { data, error } = await getDeployedDatabase(databaseId)
        console.timeEnd('get deployed database infos')

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
      console.timeEnd('new connection to authenticated')
      const serverNameParts = tlsInfo!.sniServerName!.split('.')
      // The left-most subdomain contains the database id
      const databaseId = serverNameParts[0]

      // Get an available Machine
      console.time('get machine')
      const machine = await getMachine()
      console.timeEnd('get machine')

      // Establish a TCP connection to the worker
      console.time('connect to worker')
      const workerSocket = await connectWithRetry(
        {
          host: machine.private_ip,
          port: 5432,
        },
        10000
      )
      console.timeEnd('connect to worker')

      console.log('sending databaseId to worker')
      // send the databaseId to the worker
      workerSocket.write(databaseId!, 'utf-8')

      console.time('waiting for worker to ack')
      // wait for the worker to ack
      await new Promise<void>((res, rej) =>
        workerSocket.once('data', (data) => {
          if (data.toString('utf-8') === 'ACK') {
            console.log('worker did ack')
            res()
          } else {
            rej(new Error('Worker did not ACK'))
          }
        })
      )
      console.timeEnd('waiting for worker to ack')

      // Detach from the `PostgresConnection` to prevent further buffering/processing
      const socket = connection.detach()

      // Pipe data directly between sockets
      socket.pipe(workerSocket)
      workerSocket.pipe(socket)

      socket.on('end', () => workerSocket.end())
      workerSocket.on('end', () => socket.end())

      socket.on('error', async (err) => {
        workerSocket.destroy(err)
        await suspendMachine(machine.id)
      })
      workerSocket.on('error', (err) => socket.destroy(err))

      socket.on('close', async () => {
        workerSocket.destroy()
        await suspendMachine(machine.id)
      })
      workerSocket.on('close', () => socket.destroy())
      console.timeEnd('create and connect to machine')
    },
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

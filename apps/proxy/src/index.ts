import net from 'node:net'
import { PostgresConnection, type ScramSha256Data } from 'pg-gateway'
import { env } from './env.ts'
import { getTlsOptions } from './utils/get-tls-options.ts'
import { getDeployedDatabase } from './utils/get-deployed-database.ts'
import { PostgresErrorCode, sendFatalError } from './utils/send-fatal-error.ts'
import { randomBytes } from 'node:crypto'
import { getWorker, releaseWorker } from './utils/get-worker.ts'
import { connectWithRetry } from './utils/connect-with-retry.ts'
import { debug as proxyDebug } from './lib/debug.ts'
import type { Machine } from './lib/fly.ts'

const server = net.createServer((socket) => {
  const connectionId = randomBytes(16).toString('hex')
  const debug = proxyDebug.extend(connectionId)

  const connection = new PostgresConnection(socket, {
    tls: async () => {
      try {
        debug('getting tls options')
        const tlsOptions = await getTlsOptions()
        debug('got tls options')
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

        debug(`getting deployed database infos`)
        const { data, error } = await getDeployedDatabase(databaseId)
        debug(`got deployed database infos`)

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
      const databaseId = getDatabaseId(tlsInfo?.sniServerName)

      let workerSocket: net.Socket | undefined
      let workerSyncSocket: net.Socket | undefined

      let isCleanup = false
      async function cleanup(worker: Machine) {
        if (isCleanup) {
          return
        }
        isCleanup = true
        socket.destroy()
        workerSocket?.destroy()
        workerSyncSocket?.destroy()

        debug(`releasing worker ${worker.id}`)
        await releaseWorker(worker).catch((err) => {
          console.error(`error releasing worker ${worker.id}`, err)
        })
        debug(`released worker ${worker.id}`)
      }

      // Get a worker
      debug(`getting worker`)
      const worker = await getWorker(debug)
      debug(`got worker ${worker.id}`)

      try {
        // Establish a TCP connection to the worker main socket
        debug(`connecting to worker ${worker.id}`)
        workerSocket = await connectWithRetry(
          {
            host: worker.private_ip,
            port: 5432,
          },
          10_000
        )
        debug(`connected to worker ${worker.id}`)

        const workerReady = new Promise<void>((res, rej) => {
          workerSocket!.once('data', (data) => {
            if (data.toString('utf-8') === 'ready') {
              res()
            } else {
              rej(new Error(`worker ${worker.id} not ready`))
            }
          })
        })

        // send the databaseId to the worker
        workerSocket.write(databaseId!, 'utf-8')
        debug(`sent databaseId to worker ${worker.id}`)

        debug(`waiting for worker ${worker.id} to be ready`)
        // wait for the worker to be ready
        await workerReady
        debug(`worker ${worker.id} ready`)

        // Detach from the `PostgresConnection` to prevent further buffering/processing
        const socket = connection.detach()

        socket.pipe(workerSocket)
        workerSocket.pipe(socket)

        const handleError = async (err: Error) => {
          console.error(`[${connectionId}] Socket error:`, err)
          await cleanup(worker)
        }

        const handleClose = async () => {
          debug(`socket closed`)
          await cleanup(worker)
        }

        socket.on('error', handleError)
        workerSocket.on('error', handleError)

        socket.on('close', handleClose)
        workerSocket.on('close', handleClose)
      } catch (err) {
        console.error(`[${connectionId}] error during connection`, err)
        sendFatalError(
          connection,
          PostgresErrorCode.ConnectionException,
          `failed to initialize connection to the database`
        )
        await cleanup(worker)
      }
    },
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})

function getDatabaseId(serverName?: string) {
  return serverName!.split('.').at(0)!
}

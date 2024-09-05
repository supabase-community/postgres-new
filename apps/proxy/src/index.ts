import net from 'node:net'
import { PostgresConnection, type ScramSha256Data } from 'pg-gateway'
import { env } from './env.ts'
import { getTlsOptions } from './utils/get-tls-options.ts'
import { getDeployedDatabase } from './utils/get-deployed-database.ts'
import { PostgresErrorCode, sendFatalError } from './utils/send-fatal-error.ts'
import { randomBytes } from 'node:crypto'
import { destroyWorker, getWorker, releaseWorker, type Worker } from './utils/get-worker.ts'
import { connectWithRetry } from './utils/connect-with-retry.ts'
import { scheduler } from 'node:timers/promises'
import { debug as proxyDebug } from './lib/debug.ts'

function getDatabaseId(serverName?: string) {
  // return 'fcn7kjjf6lmhfye8'
  return serverName!.split('.').at(0)!
}

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
      async function cleanup(worker: Worker, action: 'destroy' | 'release') {
        if (isCleanup) {
          return
        }
        isCleanup = true
        socket.destroy()
        workerSocket?.destroy()
        if (action === 'destroy') {
          console.time(`[${connectionId}] destroy worker ${worker.id}`)
          await destroyWorker(worker).catch((err) => {
            console.error(`[${connectionId}] error destroying worker ${worker.id}`, err)
          })
          console.timeEnd(`[${connectionId}] destroy worker ${worker.id}`)
        } else {
          debug(`waiting for worker ${worker.id} to be done`)
          await Promise.race([
            await new Promise<void>((res) => {
              workerSyncSocket?.once('data', (data) => {
                if (data.toString('utf-8') === 'done') {
                  debug(`worker ${worker.id} done`)
                  res()
                } else {
                  debug(`unknown message from worker sync socket: ${data}`)
                }
              })
            }),
            async () => {
              await scheduler.wait(5_000)
              debug(`worker ${worker.id} timed out`)
            },
          ])

          workerSyncSocket?.destroy()

          debug(`releasing worker ${worker.id}`)
          await releaseWorker(worker).catch((err) => {
            console.error(`error releasing worker ${worker.id}`, err)
          })
          debug(`released worker ${worker.id}`)
        }
        workerSyncSocket?.destroy()
      }

      // Get a worker
      debug(`getting worker`)
      const worker = await getWorker(debug)
      debug(`got worker ${worker.id}`)

      try {
        // Establish a TCP connection to the worker main socket
        debug(`connecting to worker ${worker.id} main socket`)
        workerSocket = await connectWithRetry(
          {
            host: worker.private_ip,
            port: 5432,
          },
          10_000
        )
        debug(`connected to worker ${worker.id} main socket`)

        // Establish a TCP connection to the worker sync socket
        debug(`connecting to worker ${worker.id} sync socket`)
        workerSyncSocket = await connectWithRetry(
          {
            host: worker.private_ip,
            port: 2345,
          },
          10_000
        )
        debug(`connected to worker ${worker.id} sync socket`)

        const readyPromise = new Promise<void>((res, rej) =>
          workerSyncSocket!.once('data', (data) => {
            if (data.toString('utf-8') === 'ready') {
              res()
            } else {
              rej(new Error(`[${connectionId}] unknown message from worker sync socket: ${data}`))
            }
          })
        )

        // send the databaseId to the worker
        workerSyncSocket.write(databaseId!, 'utf-8')

        // wait for the worker to be ready
        debug(`waiting for worker ${worker.id} to be ready`)
        await Promise.race([
          readyPromise,
          async () => {
            scheduler.wait(5_000)
            throw new Error(`[${connectionId}] worker ${worker.id} timeout on ready`)
          },
        ])
        debug(`worker ${worker.id} ready`)

        // Detach from the `PostgresConnection` to prevent further buffering/processing
        const socket = connection.detach()

        socket.pipe(workerSocket)
        workerSocket.pipe(socket)

        const handleError = async (err: Error) => {
          console.error(`[${connectionId}] Socket error:`, err)
          await cleanup(worker, 'destroy')
        }

        const handleClose = async (hadError: boolean) => {
          debug(`Socket closed`)
          if (hadError) {
            await cleanup(worker, 'destroy')
          } else {
            await cleanup(worker, 'release')
          }
        }

        socket.on('error', handleError)
        workerSocket.on('error', handleError)

        socket.on('close', handleClose)
        workerSocket.on('close', handleClose)
      } catch (err) {
        console.error(`[${connectionId}] error during connection`, err)
        debug(`destroying worker ${worker.id}`)
        await destroyWorker(worker).catch((err) => {
          console.error(`[${connectionId}] error destroying worker ${worker.id}`, err)
        })
        debug(`destroyed worker ${worker.id}`)
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

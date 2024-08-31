import { connect, type Socket } from 'node:net'
import type { PostgresConnection } from 'pg-gateway'

export const PostgresErrorCode = {
  ConnectionException: '08000',
} as const

export function sendFatalError(connection: PostgresConnection, code: string, message: string) {
  connection.sendError({
    severity: 'FATAL',
    code,
    message,
  })
  connection.socket.end()
}

export function connectWithRetry(params: { host: string; port: number }, timeout: number) {
  return new Promise<Socket>((resolve, reject) => {
    const startTime = Date.now()

    const attemptConnection = () => {
      const socket = connect(params)

      socket.on('error', (err) => {
        if ('code' in err && err.code === 'ECONNREFUSED' && Date.now() - startTime < timeout) {
          socket.destroy()
          setTimeout(attemptConnection, 50)
        } else {
          reject(err)
        }
      })

      socket.on('connect', () => {
        resolve(socket)
      })
    }

    attemptConnection()
  })
}

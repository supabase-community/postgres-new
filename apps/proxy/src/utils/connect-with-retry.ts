import { connect, type Socket } from 'node:net'

export function connectWithRetry(params: { host: string; port: number }, timeout: number) {
  return new Promise<Socket>((resolve, reject) => {
    const startTime = Date.now()

    const attemptConnection = () => {
      const socket = connect(params)

      socket.on('error', (err) => {
        if ('code' in err && err.code === 'ECONNREFUSED' && Date.now() - startTime < timeout) {
          socket.destroy()
          // retry every 50ms
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

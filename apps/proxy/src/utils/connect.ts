import { createConnection, type Socket } from 'node:net'

export function connect(params: { host: string; port: number }) {
  const startTime = Date.now()
  const timeout = 1_000

  return new Promise<Socket>((resolve, reject) => {
    const attemptConnection = () => {
      let timer: NodeJS.Timeout | undefined
      const socket = createConnection(params)
      socket.on('error', (err) => {
        clearTimeout(timer)
        if (
          'code' in err &&
          (err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH') &&
          Date.now() - startTime < timeout
        ) {
          socket.destroy()
          // retry every 50ms
          setTimeout(attemptConnection, 50)
        } else {
          reject(err)
        }
      })

      socket.on('connect', () => {
        clearTimeout(timer)
        resolve(socket)
      })

      timer = setTimeout(() => {
        socket.destroy()
        attemptConnection()
      }, 100)
    }

    attemptConnection()
  })
}

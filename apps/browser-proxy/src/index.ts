import { httpsServer } from './websocket-server.ts'
import { tcpServer } from './tcp-server.ts'

process.on('unhandledRejection', (reason, promise) => {
  console.error({ location: 'unhandledRejection', reason, promise })
})

process.on('uncaughtException', (error) => {
  console.error({ location: 'uncaughtException', error })
})

httpsServer.listen(443, () => {
  console.log('websocket server listening on port 443')
})

tcpServer.listen(5432, () => {
  console.log('tcp server listening on port 5432')
})

const shutdown = async () => {
  await Promise.allSettled([
    new Promise<void>((res) =>
      httpsServer.close(() => {
        res()
      })
    ),
    new Promise<void>((res) =>
      tcpServer.close(() => {
        res()
      })
    ),
  ])
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

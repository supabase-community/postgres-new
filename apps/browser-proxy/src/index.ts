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

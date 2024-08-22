import { env } from './env.js'
import { tcpServer } from './tcp-server.js'
import { websocketServer } from './websocket-server.js'

tcpServer.listen(5432, () => {
  console.log('TCP server listening on port 5432')
})

websocketServer.listen(env.WEBSOCKET_PORT, (listenSocket) => {
  if (listenSocket) {
    console.log(`Websocket server listening on port ${env.WEBSOCKET_PORT}`)
  }
})

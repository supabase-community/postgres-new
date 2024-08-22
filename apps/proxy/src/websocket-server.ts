import uWS from 'uWebSockets.js'
import { env } from './env.js'
import { tcpConnections, wsConnections } from './server-state.js'
import { getDatabaseIdFromHostname } from './utils.js'

export const websocketServer = uWS.SSLApp({
  cert_file_name: `${env.S3FS_MOUNT}/tls/cert.pem`,
  key_file_name: `${env.S3FS_MOUNT}/tls/key.pem`,
})

// WebSocket server for PGLite instances
websocketServer.ws<{ databaseId: string }>('/*', {
  upgrade: (res, req, context) => {
    const databaseId = getDatabaseIdFromHostname(req.getHeader('host'))

    if (!databaseId) {
      throw new Error('Invalid hostname')
    }

    res.upgrade(
      { databaseId },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    )
  },
  open: (ws) => {
    const databaseId = ws.getUserData().databaseId
    wsConnections.set(databaseId, ws)
    console.log(`WebSocket connected for database ${databaseId}`)
  },
  message: (ws, message) => {
    const databaseId = ws.getUserData().databaseId
    const tcpConnection = tcpConnections.get(databaseId)
    if (tcpConnection) {
      tcpConnection.socket.write(Buffer.from(message))
    }
  },
  close: (ws) => {
    const databaseId = ws.getUserData().databaseId
    wsConnections.delete(databaseId)
    const tcpConnection = tcpConnections.get(databaseId)
    tcpConnection?.socket.end()
    console.log(`WebSocket disconnected for database ${databaseId}`)
  },
})

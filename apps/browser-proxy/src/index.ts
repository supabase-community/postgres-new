import * as net from 'node:net'
import * as https from 'node:https'
import { PostgresConnection } from 'pg-gateway'
import { WebSocketServer, type WebSocket } from 'ws'
import makeDebug from 'debug'
import * as tls from 'node:tls'
import { extractDatabaseId, isValidServername } from './servername.ts'
import { getTls } from './tls.ts'

const debug = makeDebug('browser-proxy')

const tcpConnections = new Map<string, net.Socket>()
const websocketConnections = new Map<string, WebSocket>()

let tlsOptions = await getTls()

const httpsServer = https.createServer({
  ...tlsOptions,
  key: tlsOptions.key,
  requestCert: true,
  SNICallback: (servername, callback) => {
    debug('SNICallback', servername)
    if (isValidServername(servername)) {
      debug('SNICallback', 'valid')
      callback(null, tls.createSecureContext(tlsOptions))
    } else {
      debug('SNICallback', 'invalid')
      callback(new Error('invalid SNI'))
    }
  },
})

// refresh the TLS certificate every week
setInterval(
  async () => {
    tlsOptions = await getTls()
    httpsServer.setSecureContext(tlsOptions)
  },
  1000 * 60 * 60 * 24 * 7
)

const websocketServer = new WebSocketServer({
  server: httpsServer,
})

websocketServer.on('error', (error) => {
  debug('websocket server error', error)
})

websocketServer.on('connection', (socket, request) => {
  debug('websocket connection')

  const host = request.headers.host

  if (!host) {
    console.log('No host header present')
    socket.close()
    return
  }

  const databaseId = extractDatabaseId(host)

  if (websocketConnections.has(databaseId)) {
    socket.send('sorry, too many clients already')
    socket.close()
    return
  }

  websocketConnections.set(databaseId, socket)

  socket.on('message', (message: Uint8Array) => {
    const tcpSocket = tcpConnections.get(databaseId)
    tcpSocket?.write(message)
  })

  socket.on('close', () => {
    websocketConnections.delete(databaseId)
  })
})

httpsServer.listen(443, () => {
  console.log('https server listening on port 443')
})

const tcpServer = net.createServer()

tcpServer.on('connection', (socket) => {
  let databaseId: string | undefined

  const connection = new PostgresConnection(socket, {
    tls: () => tlsOptions,
    onTlsUpgrade(state) {
      if (state.tlsInfo?.sniServerName) {
        if (!isValidServername(state.tlsInfo.sniServerName)) {
          connection.sendError({
            code: '08006',
            message: 'invalid SNI',
            severity: 'FATAL',
          })
          socket.destroy()
          return
        }

        databaseId = extractDatabaseId(state.tlsInfo.sniServerName)

        if (tcpConnections.has(databaseId)) {
          connection.sendError({
            code: '53300',
            message: 'sorry, too many clients already',
            severity: 'FATAL',
          })
          socket.destroy()
          return
        }

        tcpConnections.set(databaseId, socket)
      }
    },
    onMessage(message, state) {
      if (!state.hasStarted) {
        return false
      }

      const websocket = websocketConnections.get(databaseId!)

      if (!websocket) {
        connection.sendError({
          code: 'XX000',
          message: 'no websocket connection open',
          severity: 'FATAL',
        })
        socket.destroy()
        return true
      }

      websocket.send(message)

      return true
    },
  })

  socket.on('close', () => {
    if (databaseId) {
      tcpConnections.delete(databaseId)
    }
  })
})

tcpServer.listen(5432, () => {
  console.log('tcp server listening on port 5432')
})

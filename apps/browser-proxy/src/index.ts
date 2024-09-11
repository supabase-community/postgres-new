import * as nodeNet from 'node:net'
import * as https from 'node:https'
import { PostgresConnection } from 'pg-gateway'
import { WebSocketServer, type WebSocket } from 'ws'
import makeDebug from 'debug'
import * as tls from 'node:tls'
import { extractDatabaseId, isValidServername } from './servername.ts'
import { getTls } from './tls.ts'
import { createParameterStatusMessage } from './create-message.ts'
import { extractIP } from './extract-ip.ts'

const debug = makeDebug('browser-proxy')

const tcpConnections = new Map<string, nodeNet.Socket>()
const websocketConnections = new Map<string, WebSocket>()

let tlsOptions = await getTls()

// refresh the TLS certificate every week
setInterval(
  async () => {
    tlsOptions = await getTls()
    httpsServer.setSecureContext(tlsOptions)
  },
  1000 * 60 * 60 * 24 * 7
)

const httpsServer = https.createServer({
  ...tlsOptions,
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

  socket.on('message', (data: Buffer) => {
    debug('websocket message', data.toString('hex'))
    const tcpSocket = tcpConnections.get(databaseId)
    tcpSocket?.write(data)
  })

  socket.on('close', () => {
    websocketConnections.delete(databaseId)
  })
})

// we need to use proxywrap to make our tcp server to enable the PROXY protocol support
const net = (
  process.env.FLY_APP_NAME ? (await import('findhit-proxywrap')).default.proxy(nodeNet) : nodeNet
) as typeof nodeNet

const tcpServer = net.createServer()

tcpServer.on('connection', (socket) => {
  let databaseId: string | undefined

  const connection = new PostgresConnection(socket, {
    tls: tlsOptions,
    onTlsUpgrade(state) {
      if (!state.tlsInfo?.sniServerName || !isValidServername(state.tlsInfo.sniServerName)) {
        // connection.detach()
        connection.sendError({
          code: '08006',
          message: 'invalid SNI',
          severity: 'FATAL',
        })
        connection.end()
        return
      }

      const _databaseId = extractDatabaseId(state.tlsInfo.sniServerName!)

      if (!websocketConnections.has(_databaseId!)) {
        // connection.detach()
        connection.sendError({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
        connection.end()
        return
      }

      if (tcpConnections.has(_databaseId)) {
        // connection.detach()
        connection.sendError({
          code: '53300',
          message: 'sorry, too many clients already',
          severity: 'FATAL',
        })
        connection.end()
        return
      }

      // only set the databaseId after we've verified the connection
      databaseId = _databaseId
      tcpConnections.set(databaseId!, connection.socket)
    },
    serverVersion() {
      return '16.3'
    },
    onAuthenticated() {
      const websocket = websocketConnections.get(databaseId!)

      if (!websocket) {
        connection.sendError({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
        connection.end()
        return
      }

      const clientIpMessage = createParameterStatusMessage(
        'client_ip',
        extractIP(socket.remoteAddress!)
      )
      websocket.send(clientIpMessage)
    },
    onMessage(message, state) {
      if (!state.isAuthenticated) {
        return
      }

      const websocket = websocketConnections.get(databaseId!)

      if (!websocket) {
        connection.sendError({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
        connection.end()
        return
      }

      debug('tcp message', { message })
      websocket.send(message)

      // return an empty buffer to indicate that the message has been handled
      return new Uint8Array()
    },
  })

  socket.on('close', () => {
    if (databaseId) {
      tcpConnections.delete(databaseId)
      const websocket = websocketConnections.get(databaseId)
      websocket?.send(createParameterStatusMessage('client_ip', ''))
    }
  })
})

httpsServer.listen(443, () => {
  console.log('websocket server listening on port 443')
})

tcpServer.listen(5432, () => {
  console.log('tcp server listening on port 5432')
})

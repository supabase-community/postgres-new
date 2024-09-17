import * as nodeNet from 'node:net'
import * as https from 'node:https'
import { BackendError, PostgresConnection } from 'pg-gateway'
import { fromNodeSocket } from 'pg-gateway/node'
import { WebSocketServer, type WebSocket } from 'ws'
import makeDebug from 'debug'
import { extractDatabaseId, isValidServername } from './servername.ts'
import { getTls, setSecureContext } from './tls.ts'
import { createStartupMessage } from './create-message.ts'
import { extractIP } from './extract-ip.ts'

const debug = makeDebug('browser-proxy')

const tcpConnections = new Map<string, PostgresConnection>()
const websocketConnections = new Map<string, WebSocket>()

const httpsServer = https.createServer({
  SNICallback: (servername, callback) => {
    debug('SNICallback', servername)
    if (isValidServername(servername)) {
      debug('SNICallback', 'valid')
      callback(null)
    } else {
      debug('SNICallback', 'invalid')
      callback(new Error('invalid SNI'))
    }
  },
})
await setSecureContext(httpsServer)
// reset the secure context every week to pick up any new TLS certificates
setInterval(() => setSecureContext(httpsServer), 1000 * 60 * 60 * 24 * 7)

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
    debug('No host header present')
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
    const tcpConnection = tcpConnections.get(databaseId)
    tcpConnection?.streamWriter?.write(data)
  })

  socket.on('close', () => {
    websocketConnections.delete(databaseId)
  })
})

// we need to use proxywrap to make our tcp server to enable the PROXY protocol support
const net = (
  process.env.PROXIED ? (await import('findhit-proxywrap')).default.proxy(nodeNet) : nodeNet
) as typeof nodeNet

const tcpServer = net.createServer()

tcpServer.on('connection', async (socket) => {
  let databaseId: string | undefined

  const connection = await fromNodeSocket(socket, {
    tls: getTls,
    onTlsUpgrade(state) {
      if (!state.tlsInfo?.serverName || !isValidServername(state.tlsInfo.serverName)) {
        throw BackendError.create({
          code: '08006',
          message: 'invalid SNI',
          severity: 'FATAL',
        })
      }

      const _databaseId = extractDatabaseId(state.tlsInfo.serverName!)

      if (!websocketConnections.has(_databaseId!)) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      if (tcpConnections.has(_databaseId)) {
        throw BackendError.create({
          code: '53300',
          message: 'sorry, too many clients already',
          severity: 'FATAL',
        })
      }

      // only set the databaseId after we've verified the connection
      databaseId = _databaseId
      tcpConnections.set(databaseId!, connection)
    },
    serverVersion() {
      return '16.3'
    },
    onAuthenticated() {
      const websocket = websocketConnections.get(databaseId!)

      if (!websocket) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      const clientIpMessage = createStartupMessage('postgres', 'postgres', {
        client_ip: extractIP(socket.remoteAddress!),
      })
      websocket.send(clientIpMessage)
    },
    onMessage(message, state) {
      if (!state.isAuthenticated) {
        return
      }

      const websocket = websocketConnections.get(databaseId!)

      if (!websocket) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
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
      websocket?.send(createStartupMessage('postgres', 'postgres', { client_ip: '' }))
    }
  })
})

httpsServer.listen(443, () => {
  console.log('websocket server listening on port 443')
})

tcpServer.listen(5432, () => {
  console.log('tcp server listening on port 5432')
})

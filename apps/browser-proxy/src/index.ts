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
import {
  DatabaseShared,
  DatabaseUnshared,
  logEvent,
  UserConnected,
  UserDisconnected,
} from './telemetry.ts'
import { ConnectionManager } from './connection-manager.ts'

const connectionManager = new ConnectionManager()

const debug = makeDebug('browser-proxy')

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

websocketServer.on('connection', (websocket, request) => {
  debug('websocket connection')

  const host = request.headers.host

  if (!host) {
    debug('No host header present')
    websocket.close()
    return
  }

  const databaseId = extractDatabaseId(host)

  if (!connectionManager.addWebSocketConnection(databaseId, websocket)) {
    websocket.send('sorry, too many clients already')
    websocket.close()
    return
  }

  logEvent(new DatabaseShared({ databaseId }))

  websocket.on('message', (data: Buffer) => {
    if (data.length === 0) {
      return
    }

    const activeConnectionId = connectionManager.getActiveConnectionId(databaseId)
    if (!activeConnectionId) {
      debug('Ignoring message: No active connection for database', databaseId)
      return
    }

    connectionManager.sendMessageToTcp(databaseId, activeConnectionId, data)
  })

  websocket.on('close', () => {
    connectionManager.removeWebSocketConnection(databaseId)
    logEvent(new DatabaseUnshared({ databaseId }))
  })
})

// we need to use proxywrap to make our tcp server to enable the PROXY protocol support
const net = (
  process.env.PROXIED ? (await import('findhit-proxywrap')).default.proxy(nodeNet) : nodeNet
) as typeof nodeNet

const tcpServer = net.createServer()

tcpServer.on('connection', async (socket) => {
  let databaseId: string | undefined
  let connectionId: string | null = null

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

      if (!connectionManager.hasWebSocketConnection(_databaseId!)) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      if (connectionManager.hasTcpConnection(_databaseId)) {
        throw BackendError.create({
          code: '53300',
          message: 'sorry, too many clients already',
          severity: 'FATAL',
        })
      }

      databaseId = _databaseId
      connectionId = connectionManager.addTcpConnection(databaseId, connection)
      if (!connectionId) {
        debug('Rejecting new TCP connection: already exists for database', databaseId)
        socket.destroy()
        return
      }
      logEvent(new UserConnected({ databaseId }))
    },
    serverVersion() {
      return '16.3'
    },
    onAuthenticated() {
      const websocket = connectionManager.getWebSocketConnection(databaseId!)

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
      if (!state.isAuthenticated || !databaseId || !connectionId) {
        return
      }

      if (!connectionManager.isActiveConnection(databaseId, connectionId)) {
        debug('Ignoring message for inactive connection', { databaseId, connectionId })
        return new Uint8Array()
      }

      debug('tcp message', { message })
      connectionManager.processMessage(databaseId, connectionId, message)

      return new Uint8Array()
    },
  })

  socket.on('close', () => {
    if (databaseId) {
      connectionManager.removeTcpConnection(databaseId)
      logEvent(new UserDisconnected({ databaseId }))
      connectionManager.sendMessageToWebSocket(
        databaseId,
        createStartupMessage('postgres', 'postgres', { client_ip: '' }),
        true
      )
    }
  })
})

httpsServer.listen(443, () => {
  console.log('websocket server listening on port 443')
})

tcpServer.listen(5432, () => {
  console.log('tcp server listening on port 5432')
})

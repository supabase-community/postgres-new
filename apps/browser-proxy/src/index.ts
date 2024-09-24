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

process.on('unhandledRejection', (reason, promise) => {
  console.error({ location: 'unhandledRejection', reason, promise })
})

process.on('uncaughtException', (error) => {
  console.error({ location: 'uncaughtException', error })
})

const debug = makeDebug('browser-proxy')
try {
  type DatabaseId = string
  type ConnectionId = string
  const tcpConnections = new Map<ConnectionId, PostgresConnection>()
  const tcpConnectionsByDatabaseId = new Map<DatabaseId, number>()
  const websocketConnections = new Map<DatabaseId, WebSocket>()

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

    logEvent(new DatabaseShared({ databaseId }))

    socket.on('message', (data: Buffer) => {
      if (data.length === 0) {
        return
      }

      const connectionId = data.slice(0, 8)
      const message = data.slice(8)
      const tcpConnection = tcpConnections.get(Buffer.from(connectionId).toString('hex'))
      if (tcpConnection) {
        debug('websocket message', message.toString('hex'))
        tcpConnection.streamWriter?.write(message)
      }
    })

    socket.on('close', () => {
      websocketConnections.delete(databaseId)
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
    let connectionId: string | undefined

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

        const tcpConnectionCount = tcpConnectionsByDatabaseId.get(_databaseId) ?? 0

        if (tcpConnectionCount === 1) {
          throw BackendError.create({
            code: '53300',
            message: 'sorry, too many clients already',
            severity: 'FATAL',
          })
        }

        tcpConnectionsByDatabaseId.set(_databaseId, 1)

        // only set the databaseId after we've verified the connection
        databaseId = _databaseId
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

        const _connectionId = new Uint8Array(8)
        crypto.getRandomValues(_connectionId)

        connectionId = Buffer.from(_connectionId).toString('hex')
        tcpConnections.set(connectionId, connection)

        logEvent(new UserConnected({ databaseId: databaseId! }))

        const clientIpMessage = createStartupMessage('postgres', 'postgres', {
          client_ip: extractIP(socket.remoteAddress!),
        })
        websocket.send(wrapMessage(_connectionId, clientIpMessage))
      },
      onMessage(message, state) {
        if (message.length === 0) {
          return
        }

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
        // wrap the message with the connection id
        websocket.send(wrapMessage(hexToUint8Array(connectionId!), message))

        // return an empty buffer to indicate that the message has been handled
        return new Uint8Array()
      },
    })

    socket.on('close', () => {
      if (databaseId) {
        tcpConnections.delete(connectionId!)
        tcpConnectionsByDatabaseId.delete(databaseId)
        logEvent(new UserDisconnected({ databaseId }))
        const websocket = websocketConnections.get(databaseId)
        websocket?.send(
          wrapMessage(
            hexToUint8Array(connectionId!),
            createStartupMessage('postgres', 'postgres', { client_ip: '' })
          )
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

  function wrapMessage(connectionId: Uint8Array, message: ArrayBuffer | Uint8Array): Uint8Array {
    // Convert message to Uint8Array if it's an ArrayBuffer
    const messageArray = message instanceof ArrayBuffer ? new Uint8Array(message) : message

    // Create a new Uint8Array to hold the connectionId and the message
    const wrappedMessage = new Uint8Array(connectionId.length + messageArray.length)

    // Copy the connectionId and the message into the new Uint8Array
    wrappedMessage.set(connectionId, 0)
    wrappedMessage.set(messageArray, connectionId.length)

    return wrappedMessage
  }

  function uint8ArrayToHex(array: Uint8Array): string {
    return Buffer.from(array).toString('hex')
  }

  function hexToUint8Array(hex: string): Uint8Array {
    const buffer = Buffer.from(hex, 'hex')
    return new Uint8Array(buffer)
  }
} catch (error) {
  console.error(error)
}

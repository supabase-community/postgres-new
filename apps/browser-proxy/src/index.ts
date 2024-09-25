import * as nodeNet from 'node:net'
import * as https from 'node:https'
import { BackendError, PostgresConnection } from 'pg-gateway'
import { fromNodeSocket } from 'pg-gateway/node'
import { WebSocketServer, type WebSocket } from 'ws'
import makeDebug from 'debug'
import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

process.on('unhandledRejection', (reason, promise) => {
  console.error({ location: 'unhandledRejection', reason, promise })
})

process.on('uncaughtException', (error) => {
  console.error({ location: 'uncaughtException', error })
})

const debug = makeDebug('browser-proxy')

type DatabaseId = string
type ConnectionId = string
const tcpConnections = new Map<ConnectionId, PostgresConnection>()
const tcpConnectionsByDatabaseId = new Set<DatabaseId>()
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

websocketServer.on('connection', async (socket, request) => {
  debug('websocket connection')

  const host = request.headers.host

  if (!host) {
    debug('No host header present')
    socket.close()
    return
  }

  // authenticate the user
  const url = new URL(request.url!, `https://${host}`)
  const token = url.searchParams.get('token')
  if (!token) {
    debug('No token present in URL query parameters')
    socket.close()
    return
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error) {
    debug('Error authenticating user', error)
    socket.close()
    return
  }

  const { user } = data

  const databaseId = extractDatabaseId(host)

  if (websocketConnections.has(databaseId)) {
    socket.send('sorry, too many clients already')
    socket.close()
    return
  }

  websocketConnections.set(databaseId, socket)

  logEvent(new DatabaseShared({ databaseId, userId: user.id }))

  socket.on('message', (data: Buffer) => {
    if (data.length === 0) {
      return
    }

    const connectionId = data.subarray(0, 8)
    const message = data.subarray(8)
    const tcpConnection = tcpConnections.get(Buffer.from(connectionId).toString('hex'))
    if (tcpConnection) {
      debug('websocket message', message.toString('hex'))
      tcpConnection.streamWriter?.write(message)
    }
  })

  socket.on('close', () => {
    websocketConnections.delete(databaseId)
    logEvent(new DatabaseUnshared({ databaseId, userId: user.id }))
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

  debug('new tcp connection')

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

      if (tcpConnectionsByDatabaseId.has(_databaseId)) {
        throw BackendError.create({
          code: '53300',
          message: 'sorry, too many clients already',
          severity: 'FATAL',
        })
      }

      tcpConnectionsByDatabaseId.add(_databaseId)

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

      logEvent(new UserConnected({ databaseId: databaseId!, connectionId }))

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
      logEvent(new UserDisconnected({ databaseId, connectionId: connectionId! }))
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

function wrapMessage(connectionId: Uint8Array, message: Uint8Array): Uint8Array {
  // Create a new Uint8Array to hold the connectionId and the message
  const wrappedMessage = new Uint8Array(connectionId.length + message.length)

  // Copy the connectionId and the message into the new Uint8Array
  wrappedMessage.set(connectionId, 0)
  wrappedMessage.set(message, connectionId.length)

  return wrappedMessage
}

function hexToUint8Array(hex: string): Uint8Array {
  const buffer = Buffer.from(hex, 'hex')
  return new Uint8Array(buffer)
}

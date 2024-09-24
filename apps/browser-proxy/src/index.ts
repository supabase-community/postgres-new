import * as nodeNet from 'node:net'
import * as https from 'node:https'
import { BackendError, PostgresConnection } from 'pg-gateway'
import { fromNodeSocket } from 'pg-gateway/node'
import { WebSocket, WebSocketServer, createWebSocketStream } from 'ws'
import makeDebug from 'debug'
import { yamux } from '@chainsafe/libp2p-yamux'
import { pipe } from 'it-pipe'
import { prefixLogger } from '@libp2p/logger'
import * as toIterable from 'stream-to-it'
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

const debug = makeDebug('browser-proxy')

const tcpConnections = new Map<string, PostgresConnection>()
const websocketConnections = new Map<string, WebSocket>()

type StreamMuxer = ReturnType<ReturnType<ReturnType<typeof yamux>>['createStreamMuxer']>
type Extract<T> = T extends Promise<infer U> ? U : T
type Stream = Extract<ReturnType<StreamMuxer['newStream']>>

const muxers = new Map<string, StreamMuxer>()

const serverMuxer = yamux({
  direction: 'inbound',
  onIncomingStream(stream) {},
  onStreamEnd(stream) {},
})({ logger: prefixLogger('yamux-ws') })

const clientMuxer = yamux({
  direction: 'outbound',
  onIncomingStream(stream) {},
  onStreamEnd(stream) {},
})({ logger: prefixLogger('yamux-tcp') })

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

  const databaseId = extractDatabaseId(host)

  if (websocketConnections.has(databaseId)) {
    socket.send('sorry, too many clients already')
    socket.close()
    return
  }

  const muxer = serverMuxer.createStreamMuxer({
    onIncomingStream(stream) {},
    onStreamEnd(stream) {},
  })

  const websocketStream = createWebSocketStream(socket)
  const websocketDuplex = toIterable.duplex(websocketStream)
  void pipe(websocketDuplex, muxer, websocketDuplex)

  muxers.set(databaseId, muxer)
  // websocketConnections.set(databaseId, socket)

  logEvent(new DatabaseShared({ databaseId }))

  // socket.on('message', (data: Buffer) => {
  //   debug('websocket message', data.toString('hex'))
  //   const tcpConnection = tcpConnections.get(databaseId)
  //   tcpConnection?.streamWriter?.write(data)
  // })

  socket.on('close', () => {
    muxers.delete(databaseId)
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
  let stream: Stream | undefined

  const connection = await fromNodeSocket(socket, {
    tls: getTls,
    async onTlsUpgrade(state) {
      if (!state.tlsInfo?.serverName || !isValidServername(state.tlsInfo.serverName)) {
        throw BackendError.create({
          code: '08006',
          message: 'invalid SNI',
          severity: 'FATAL',
        })
      }

      const _databaseId = extractDatabaseId(state.tlsInfo.serverName!)

      if (!muxers.has(_databaseId!)) {
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

      const muxer = muxers.get(databaseId!)
      if (!muxer) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      stream = await muxer.newStream()

      tcpConnections.set(databaseId!, connection)

      logEvent(new UserConnected({ databaseId }))
    },
    serverVersion() {
      return '16.3'
    },
    async onAuthenticated() {
      const muxer = muxers.get(databaseId!)

      if (!muxer) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      const clientIpMessage = createStartupMessage('postgres', 'postgres', {
        client_ip: extractIP(socket.remoteAddress!),
      })
      await pipe(clientIpMessage, stream)
    },
    async onMessage(message, state) {
      if (!state.isAuthenticated) {
        return
      }

      const muxer = muxers.get(databaseId!)

      if (!muxer) {
        throw BackendError.create({
          code: 'XX000',
          message: 'the browser is not sharing the database',
          severity: 'FATAL',
        })
      }

      debug('tcp message', { message })

      // @ts-expect-error
      await pipe(message, stream)

      // await stream.sink([message])

      // websocket.send(message)

      // return an empty buffer to indicate that the message has been handled
      return new Uint8Array()
    },
  })

  socket.on('close', async () => {
    await stream?.close()
    if (databaseId) {
      tcpConnections.delete(databaseId)
      logEvent(new UserDisconnected({ databaseId }))
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

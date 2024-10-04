import * as https from 'node:https'
import { WebSocketServer } from 'ws'
import { debug as mainDebug } from './debug.ts'
import { createClient } from '@supabase/supabase-js'
import { extractDatabaseId, isValidServername } from './servername.ts'
import { setSecureContext } from './tls.ts'
import { connectionManager } from './connection-manager.ts'
import { DatabaseShared, DatabaseUnshared, logEvent } from './telemetry.ts'
import { parse } from './protocol.ts'
import { pgDumpMiddleware } from './pg-dump-middleware/pg-dump-middleware.ts'
import { BackendError } from 'pg-gateway'

const debug = mainDebug.extend('websocket-server')

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

export const httpsServer = https.createServer({
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

websocketServer.on('connection', async (websocket, request) => {
  debug('websocket connection')

  const host = request.headers.host

  if (!host) {
    debug('No host header present')
    websocket.close()
    return
  }

  // authenticate the user
  const url = new URL(request.url!, `https://${host}`)
  const token = url.searchParams.get('token')
  if (!token) {
    debug('No token present in URL query parameters')
    websocket.close()
    return
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error) {
    debug('Error authenticating user', error)
    websocket.close()
    return
  }

  const { user } = data

  const databaseId = extractDatabaseId(host)

  if (connectionManager.hasWebsocket(databaseId)) {
    debug('Database already shared')
    websocket.close()
    return
  }

  connectionManager.setWebsocket(databaseId, websocket)
  logEvent(new DatabaseShared({ databaseId, userId: user.id }))

  websocket.on('message', (data: Buffer) => {
    let { connectionId, message } = parse(data)
    const tcpConnection = connectionManager.getSocket(connectionId)
    if (tcpConnection) {
      debug('websocket message: %e', () => message.toString('hex'))
      message = Buffer.from(
        pgDumpMiddleware.server(
          connectionId,
          tcpConnection.state,
          new Uint8Array(message.buffer, message.byteOffset, message.byteLength)
        )
      )
      tcpConnection.streamWriter?.write(message)
    }
  })

  // 1 hour lifetime for the websocket connection
  const websocketConnectionTimeout = setTimeout(
    () => {
      debug('websocket connection timed out')
      const tcpConnection = connectionManager.getSocketForDatabase(databaseId)
      if (tcpConnection) {
        const errorMessage = BackendError.create({
          code: '57P01',
          message: 'terminating connection due to lifetime timeout (1 hour)',
          severity: 'FATAL',
        }).flush()
        tcpConnection.streamWriter?.write(errorMessage)
      }
      websocket.close()
    },
    1000 * 60 * 60 * 1
  )

  websocket.on('close', () => {
    clearTimeout(websocketConnectionTimeout)
    connectionManager.deleteWebsocket(databaseId)
    // TODO: have a way of ending a PostgresConnection
    logEvent(new DatabaseUnshared({ databaseId, userId: user.id }))
  })
})

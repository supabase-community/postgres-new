import { WebSocket } from 'ws'
import { PostgresConnection } from 'pg-gateway'
import makeDebug from 'debug'

const debug = makeDebug('browser-proxy')

export class ConnectionManager {
  private tcpConnections = new Map<string, PostgresConnection>()
  private websocketConnections = new Map<string, WebSocket>()
  private activeConnectionIds = new Map<string, string>()

  addTcpConnection(databaseId: string, connection: PostgresConnection): string | null {
    if (this.tcpConnections.has(databaseId)) {
      debug('TCP connection already exists for database', databaseId)
      return null
    }
    const connectionId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    this.tcpConnections.set(databaseId, connection)
    this.activeConnectionIds.set(databaseId, connectionId)
    return connectionId
  }

  removeTcpConnection(databaseId: string) {
    this.tcpConnections.delete(databaseId)
    this.activeConnectionIds.delete(databaseId)
  }

  addWebSocketConnection(databaseId: string, websocket: WebSocket): boolean {
    if (this.websocketConnections.has(databaseId)) {
      debug('WebSocket connection already exists for database', databaseId)
      return false
    }
    this.websocketConnections.set(databaseId, websocket)
    return true
  }

  removeWebSocketConnection(databaseId: string) {
    this.websocketConnections.delete(databaseId)
  }

  sendMessageToWebSocket(
    databaseId: string,
    message: ArrayBuffer | Uint8Array,
    force: boolean = false
  ) {
    const websocket = this.websocketConnections.get(databaseId)

    if (!websocket) {
      debug('Ignoring message: No websocket connection for database', databaseId)
      return
    }

    const activeConnectionId = this.activeConnectionIds.get(databaseId)

    if (!activeConnectionId && !force) {
      console.log({ message })
      debug('Ignoring message: No active connection for database', databaseId)
      return
    }

    debug('Sending message to websocket', { databaseId, message })
    websocket?.send(message)
  }

  sendMessageToTcp(databaseId: string, connectionId: string, data: Buffer) {
    const tcpConnection = this.tcpConnections.get(databaseId)
    const activeConnectionId = this.activeConnectionIds.get(databaseId)

    if (!tcpConnection || activeConnectionId !== connectionId) {
      debug('Ignoring message: No TCP connection for database or connection ID mismatch', {
        databaseId,
        connectionId,
      })
      return
    }

    debug('Sending message to TCP connection', { databaseId, data })
    tcpConnection.streamWriter?.write(data)
  }

  isActiveConnection(databaseId: string, connectionId: string) {
    return this.activeConnectionIds.get(databaseId) === connectionId
  }

  hasWebSocketConnection(databaseId: string): boolean {
    return this.websocketConnections.has(databaseId)
  }

  hasTcpConnection(databaseId: string): boolean {
    return this.tcpConnections.has(databaseId)
  }

  getWebSocketConnection(databaseId: string): WebSocket | undefined {
    return this.websocketConnections.get(databaseId)
  }

  getActiveConnectionId(databaseId: string): string | undefined {
    return this.activeConnectionIds.get(databaseId)
  }
}

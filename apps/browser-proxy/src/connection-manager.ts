import type { PostgresConnection } from 'pg-gateway'
import type { WebSocket } from 'ws'

type DatabaseId = string
type ConnectionId = string

class ConnectionManager {
  private socketsByDatabase: Map<DatabaseId, ConnectionId> = new Map()
  private sockets: Map<ConnectionId, PostgresConnection> = new Map()
  private websockets: Map<DatabaseId, WebSocket> = new Map()

  constructor() {}

  public hasSocketForDatabase(databaseId: DatabaseId) {
    return this.socketsByDatabase.has(databaseId)
  }

  public getSocket(connectionId: ConnectionId) {
    return this.sockets.get(connectionId)
  }

  public setSocket(databaseId: DatabaseId, connectionId: ConnectionId, socket: PostgresConnection) {
    this.sockets.set(connectionId, socket)
    this.socketsByDatabase.set(databaseId, connectionId)
  }

  public deleteSocketForDatabase(databaseId: DatabaseId) {
    const connectionId = this.socketsByDatabase.get(databaseId)
    this.socketsByDatabase.delete(databaseId)
    if (connectionId) {
      this.sockets.delete(connectionId)
    }
  }

  public hasWebsocket(databaseId: DatabaseId) {
    return this.websockets.has(databaseId)
  }

  public getWebsocket(databaseId: DatabaseId) {
    return this.websockets.get(databaseId)
  }

  public setWebsocket(databaseId: DatabaseId, websocket: WebSocket) {
    this.websockets.set(databaseId, websocket)
  }

  public deleteWebsocket(databaseId: DatabaseId) {
    this.websockets.delete(databaseId)
    this.deleteSocketForDatabase(databaseId)
  }
}

export const connectionManager = new ConnectionManager()

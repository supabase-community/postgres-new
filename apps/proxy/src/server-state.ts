import type { WebSocket } from 'uWebSockets.js'
import type { PostgresConnection } from 'pg-gateway'

export const wsConnections = new Map<string, WebSocket<{ databaseId: string }>>()
export const tcpConnections = new Map<string, PostgresConnection>()

import type { PostgresConnection } from 'pg-gateway'

export const PostgresErrorCode = {
  ConnectionException: '08000',
} as const

export function sendFatalError(connection: PostgresConnection, code: string, message: string) {
  connection.sendError({
    severity: 'FATAL',
    code,
    message,
  })
  connection.socket.end()
}

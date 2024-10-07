import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

export function getConnectionId(): string {
  return nanoid()
}

export function parse<T extends Buffer | Uint8Array>(data: T) {
  const connectionIdBytes = data.subarray(0, 16)
  const connectionId = new TextDecoder().decode(connectionIdBytes)
  const message = data.subarray(16)
  return { connectionId, message } as { connectionId: string; message: T }
}

export function serialize(connectionId: string, message: Uint8Array) {
  const encoder = new TextEncoder()
  const connectionIdBytes = encoder.encode(connectionId)
  const data = new Uint8Array(connectionIdBytes.length + message.length)
  data.set(connectionIdBytes, 0)
  data.set(message, connectionIdBytes.length)
  return data
}

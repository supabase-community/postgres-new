export function createStartupMessage(
  user: string,
  database: string,
  additionalParams: Record<string, string> = {}
): Uint8Array {
  const encoder = new TextEncoder()

  // Protocol version number (3.0)
  const protocolVersion = 196608

  // Combine required and additional parameters
  const params = {
    user,
    database,
    ...additionalParams,
  }

  // Calculate total message length
  let messageLength = 4 // Protocol version
  for (const [key, value] of Object.entries(params)) {
    messageLength += key.length + 1 + value.length + 1
  }
  messageLength += 1 // Null terminator

  const uint8Array = new Uint8Array(4 + messageLength)
  const view = new DataView(uint8Array.buffer)

  let offset = 0
  view.setInt32(offset, messageLength + 4, false) // Total message length (including itself)
  offset += 4
  view.setInt32(offset, protocolVersion, false) // Protocol version number
  offset += 4

  // Write key-value pairs
  for (const [key, value] of Object.entries(params)) {
    uint8Array.set(encoder.encode(key), offset)
    offset += key.length
    uint8Array.set([0], offset++) // Null terminator for key
    uint8Array.set(encoder.encode(value), offset)
    offset += value.length
    uint8Array.set([0], offset++) // Null terminator for value
  }

  uint8Array.set([0], offset) // Final null terminator

  return uint8Array
}

export function createTerminateMessage(): Uint8Array {
  const uint8Array = new Uint8Array(5)
  const view = new DataView(uint8Array.buffer)
  view.setUint8(0, 'X'.charCodeAt(0))
  view.setUint32(1, 4, false)
  return uint8Array
}

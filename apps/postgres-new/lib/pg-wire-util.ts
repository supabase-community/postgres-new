export function isStartupMessage(message: Uint8Array): boolean {
  if (message.length < 8) {
    return false // Message is too short to be a valid startup message
  }

  const view = new DataView(message.buffer, message.byteOffset, message.byteLength)

  // Get the message length (first 4 bytes)
  const messageLength = view.getInt32(0, false) // big-endian

  // Check if the message length matches the actual buffer length
  if (messageLength !== message.length) {
    return false
  }

  // Get the protocol version (next 4 bytes)
  const protocolVersion = view.getInt32(4, false) // big-endian

  // Check if the protocol version is valid (3.0)
  // Protocol version 3.0 is represented as 196608 (0x00030000)
  if (protocolVersion !== 196608) {
    return false
  }

  // Additional check: ensure the message ends with a null terminator
  if (message[message.length - 1] !== 0) {
    return false
  }

  return true
}

export function parseStartupMessage(message: Uint8Array): {
  user: string
  database: string
  [key: string]: string
} {
  const view = new DataView(message.buffer, message.byteOffset, message.byteLength)
  const decoder = new TextDecoder()
  // @ts-expect-error we check at runtime that user and database are present
  const params: {
    user: string
    database: string
    [key: string]: string
  } = {}

  // Skip the message length (4 bytes) and protocol version (4 bytes)
  let offset = 8

  while (offset < message.length) {
    let keyStart = offset
    let keyEnd = keyStart
    while (message[keyEnd] !== 0 && keyEnd < message.length) {
      keyEnd++
    }
    if (keyEnd === message.length) break // End of message

    const key = decoder.decode(message.subarray(keyStart, keyEnd))
    offset = keyEnd + 1 // Skip null terminator

    let valueStart = offset
    let valueEnd = valueStart
    while (message[valueEnd] !== 0 && valueEnd < message.length) {
      valueEnd++
    }
    if (valueEnd === message.length) break // End of message

    const value = decoder.decode(message.subarray(valueStart, valueEnd))
    offset = valueEnd + 1 // Skip null terminator

    params[key] = value

    if (message[offset] === 0) break // Final null terminator
  }

  if (!params.user || !params.database) {
    throw new Error('user or database not found in startup message')
  }

  return params
}

export function isTerminateMessage(message: Uint8Array): boolean {
  // A valid Terminate message should be exactly 5 bytes long
  if (message.length !== 5) {
    return false
  }

  const view = new DataView(message.buffer, message.byteOffset, message.byteLength)

  if (message[0] !== 'X'.charCodeAt(0)) {
    return false
  }

  // Check if the length field (next 4 bytes) is equal to 4
  const length = view.getInt32(1, false)
  if (length !== 4) {
    return false
  }

  return true
}

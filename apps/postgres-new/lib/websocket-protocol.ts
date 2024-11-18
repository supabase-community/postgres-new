// Our protocol structure:
// +------------------+-----------------------------+
// |   connectionId   |           message           |
// |    (16 bytes)    |     (variable length)       |
// +------------------+-----------------------------+

export function parse(data: Uint8Array) {
  const connectionIdBytes = data.subarray(0, 16)
  const connectionId = new TextDecoder().decode(connectionIdBytes)
  const message = data.subarray(16)
  return { connectionId, message }
}

export function serialize(connectionId: string, message: Uint8Array) {
  const encoder = new TextEncoder()
  const connectionIdBytes = encoder.encode(connectionId)
  const data = new Uint8Array(connectionIdBytes.length + message.length)
  data.set(connectionIdBytes, 0)
  data.set(message, connectionIdBytes.length)
  return data
}

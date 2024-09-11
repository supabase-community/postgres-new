export function createParameterStatusMessage(name: string, value: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const nameBuffer = encoder.encode(name + '\0')
  const valueBuffer = encoder.encode(value + '\0')

  const messageLength = 4 + nameBuffer.length + valueBuffer.length
  const message = new ArrayBuffer(1 + messageLength)
  const view = new DataView(message)
  const uint8Array = new Uint8Array(message)

  let offset = 0
  view.setUint8(offset++, 'S'.charCodeAt(0)) // Message type
  view.setUint32(offset, messageLength, false) // Message length (big-endian)
  offset += 4

  uint8Array.set(nameBuffer, offset)
  offset += nameBuffer.length

  uint8Array.set(valueBuffer, offset)

  return message
}

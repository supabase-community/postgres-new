export function parseRowDescription(message: Uint8Array): string[] {
  const fieldCount = new DataView(message.buffer, message.byteOffset + 5, 2).getUint16(0)
  const names: string[] = []
  let offset = 7

  for (let i = 0; i < fieldCount; i++) {
    const nameEnd = message.indexOf(0, offset)
    names.push(new TextDecoder().decode(message.subarray(offset, nameEnd)))
    offset = nameEnd + 19 // Skip null terminator and 18 bytes of field info
  }

  return names
}

export function parseDataRowFields(
  message: Uint8Array
): { value: string | null; length: number }[] {
  const fieldCount = new DataView(message.buffer, message.byteOffset + 5, 2).getUint16(0)
  const fields: { value: string | null; length: number }[] = []
  let offset = 7

  for (let i = 0; i < fieldCount; i++) {
    const fieldLength = new DataView(message.buffer, message.byteOffset + offset, 4).getInt32(0)
    offset += 4

    if (fieldLength === -1) {
      fields.push({ value: null, length: -1 })
    } else {
      fields.push({
        value: new TextDecoder().decode(message.subarray(offset, offset + fieldLength)),
        length: fieldLength,
      })
      offset += fieldLength
    }
  }

  return fields
}

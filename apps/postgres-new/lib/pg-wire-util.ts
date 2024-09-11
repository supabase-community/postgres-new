export function parseParameterStatus(data: Uint8Array): { name: string; value: string } {
  const decoder = new TextDecoder()

  // Skip message type (1 byte) and length (4 bytes)
  let offset = 5

  // Find the null terminator for the name
  let nameEnd = offset
  while (data[nameEnd] !== 0) nameEnd++

  const name = decoder.decode(data.subarray(offset, nameEnd))
  offset = nameEnd + 1

  // Find the null terminator for the value
  let valueEnd = offset
  while (data[valueEnd] !== 0) valueEnd++

  const value = decoder.decode(data.subarray(offset, valueEnd))

  return { name, value }
}

import { VECTOR_OID } from './constants.ts'
import { parseDataRowFields, parseRowDescription } from './utils.ts'

export function isGetExtensionMembershipQuery(message: Uint8Array): boolean {
  // Check if it's a SimpleQuery message (starts with 'Q')
  if (message[0] !== 0x51) {
    // 'Q' in ASCII
    return false
  }

  const query =
    "SELECT classid, objid, refobjid FROM pg_depend WHERE refclassid = 'pg_extension'::regclass AND deptype = 'e' ORDER BY 3"

  // Skip the message type (1 byte) and message length (4 bytes)
  const messageString = new TextDecoder().decode(message.slice(5))

  // Trim any trailing null character
  const trimmedMessage = messageString.replace(/\0+$/, '')

  // Check if the message exactly matches the query
  return trimmedMessage === query
}

export function patchGetExtensionMembershipResult(data: Uint8Array, vectorOid: string): Uint8Array {
  let offset = 0
  const messages: Uint8Array[] = []
  let isDependencyTable = false
  let objidIndex = -1
  let refobjidIndex = -1
  let patchedRowCount = 0
  let totalRowsProcessed = 0

  const expectedColumns = ['classid', 'objid', 'refobjid']

  while (offset < data.length) {
    const messageType = data[offset]
    const messageLength = new DataView(data.buffer, data.byteOffset + offset + 1, 4).getUint32(
      0,
      false
    )
    const message = data.subarray(offset, offset + messageLength + 1)

    if (messageType === 0x54) {
      // RowDescription
      const columnNames = parseRowDescription(message)
      isDependencyTable =
        columnNames.length === 3 && columnNames.every((col) => expectedColumns.includes(col))
      if (isDependencyTable) {
        objidIndex = columnNames.indexOf('objid')
        refobjidIndex = columnNames.indexOf('refobjid')
      }
    } else if (messageType === 0x44 && isDependencyTable) {
      // DataRow
      const fields = parseDataRowFields(message)
      totalRowsProcessed++

      if (fields.length === 3) {
        const refobjid = fields[refobjidIndex]!.value

        if (refobjid === vectorOid) {
          const patchedMessage = patchDependencyRow(message, refobjidIndex)
          messages.push(patchedMessage)
          patchedRowCount++
          offset += messageLength + 1
          continue
        }
      }
    }

    messages.push(message)
    offset += messageLength + 1
  }

  return new Uint8Array(
    messages.reduce((acc, val) => {
      const combined = new Uint8Array(acc.length + val.length)
      combined.set(acc)
      combined.set(val, acc.length)
      return combined
    }, new Uint8Array())
  )
}

function patchDependencyRow(message: Uint8Array, refobjidIndex: number): Uint8Array {
  const newArray = new Uint8Array(message)
  let offset = 7 // Start after message type (1 byte), message length (4 bytes), and field count (2 bytes)

  // Navigate to the refobjid field
  for (let i = 0; i < refobjidIndex; i++) {
    const fieldLength = new DataView(newArray.buffer, offset, 4).getInt32(0)
    offset += 4 // Skip the length field
    if (fieldLength > 0) {
      offset += fieldLength // Skip the field value
    }
  }

  // Now we're at the start of the refobjid field
  const refobjidLength = new DataView(newArray.buffer, offset, 4).getInt32(0)
  offset += 4 // Move past the length field

  const encoder = new TextEncoder()

  // Write the new OID value
  const newRefobjidBytes = encoder.encode(VECTOR_OID.padStart(refobjidLength, '0'))
  newArray.set(newRefobjidBytes, offset)

  return newArray
}

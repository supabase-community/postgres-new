import { VECTOR_OID } from './constants.ts'
import { parseDataRowFields, parseRowDescription } from './utils.ts'

export function isGetExtensionsQuery(message: Uint8Array): boolean {
  // Check if it's a SimpleQuery message (starts with 'Q')
  if (message[0] !== 0x51) {
    // 'Q' in ASCII
    return false
  }

  const query =
    'SELECT x.tableoid, x.oid, x.extname, n.nspname, x.extrelocatable, x.extversion, x.extconfig, x.extcondition FROM pg_extension x JOIN pg_namespace n ON n.oid = x.extnamespace'

  // Skip the message type (1 byte) and message length (4 bytes)
  const messageString = new TextDecoder().decode(message.slice(5))

  // Trim any trailing null character
  const trimmedMessage = messageString.replace(/\0+$/, '')

  // Check if the message exactly matches the query
  return trimmedMessage === query
}

export function patchGetExtensionsResult(data: Uint8Array) {
  let offset = 0
  const messages: Uint8Array[] = []
  let isVectorExtensionTable = false
  let oidColumnIndex = -1
  let extnameColumnIndex = -1
  let vectorOid: string | null = null

  const expectedColumns = [
    'tableoid',
    'oid',
    'extname',
    'nspname',
    'extrelocatable',
    'extversion',
    'extconfig',
    'extcondition',
  ]

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

      isVectorExtensionTable =
        columnNames.length === expectedColumns.length &&
        columnNames.every((col) => expectedColumns.includes(col))

      if (isVectorExtensionTable) {
        oidColumnIndex = columnNames.indexOf('oid')
        extnameColumnIndex = columnNames.indexOf('extname')
      }
    } else if (messageType === 0x44 && isVectorExtensionTable) {
      // DataRow
      const fields = parseDataRowFields(message)
      if (fields[extnameColumnIndex]?.value === 'vector') {
        vectorOid = fields[oidColumnIndex]!.value!
        const patchedMessage = patchOidField(message, oidColumnIndex, fields)
        messages.push(patchedMessage)
        offset += messageLength + 1
        continue
      }
    }

    messages.push(message)
    offset += messageLength + 1
  }

  return {
    message: Buffer.concat(messages),
    vectorOid,
  }
}

function patchOidField(
  message: Uint8Array,
  oidIndex: number,
  fields: { value: string | null; length: number }[]
): Uint8Array {
  const oldOidField = fields[oidIndex]!
  const newOid = VECTOR_OID.padStart(oldOidField.length, '0')

  const newArray = new Uint8Array(message)

  let offset = 7 // Start after message type (1 byte), message length (4 bytes), and field count (2 bytes)

  // Navigate to the OID field
  for (let i = 0; i < oidIndex; i++) {
    const fieldLength = new DataView(newArray.buffer, offset, 4).getInt32(0)
    offset += 4 // Skip the length field
    if (fieldLength > 0) {
      offset += fieldLength // Skip the field value
    }
  }

  // Now we're at the start of the OID field
  const oidLength = new DataView(newArray.buffer, offset, 4).getInt32(0)
  offset += 4 // Move past the length field

  // Ensure the new OID fits in the allocated space
  if (newOid.length !== oidLength) {
    console.warn(
      `New OID length (${newOid.length}) doesn't match the original length (${oidLength}). Skipping patch.`
    )
    return message
  }

  // Write the new OID value
  for (let i = 0; i < oidLength; i++) {
    newArray[offset + i] = newOid.charCodeAt(i)
  }

  return newArray
}

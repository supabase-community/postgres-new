interface S3GetOptions {
  endpoint: string
  bucket: string
  region: string
  key: string
  accessKeyId: string
  secretAccessKey: string
}

export async function s3GetObject(options: S3GetOptions): Promise<Response> {
  const { endpoint, bucket, region, key, accessKeyId, secretAccessKey } = options
  const service = 's3'
  const url = new URL(`${endpoint}/${bucket}/${key}`)
  const host = url.host
  const path = url.pathname
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const emptyHash = await sha256('')

  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${emptyHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n')

  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    'GET',
    path, // Use the full path from the endpoint
    '',
    canonicalHeaders,
    '',
    signedHeaders,
    emptyHash,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    await sha256(canonicalRequest),
  ].join('\n')

  const signature = bufferToHex(
    await hmacSha256(
      await getSignatureKey(secretAccessKey, dateStamp, region, service),
      stringToSign
    )
  )

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`,
    `SignedHeaders=host;x-amz-content-sha256;x-amz-date`,
    `Signature=${signature}`,
  ].join(', ')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': emptyHash,
      Authorization: authorization,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${key}`), dateStamp)
  const kRegion = await hmacSha256(kDate, regionName)
  const kService = await hmacSha256(kRegion, serviceName)
  return hmacSha256(kService, 'aws4_request')
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return bufferToHex(new Uint8Array(hashBuffer))
}

async function hmacSha256(key: Uint8Array | string, message: string): Promise<Uint8Array> {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const msgBuffer = new TextEncoder().encode(message)
  const signBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer)
  return new Uint8Array(signBuffer)
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

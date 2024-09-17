import { Buffer } from 'node:buffer'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pMemoize from 'p-memoize'
import ExpiryMap from 'expiry-map'
import type { Server } from 'node:https'

const s3Client = new S3Client({ forcePathStyle: true })

async function _getTls() {
  const cert = await s3Client
    .send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `tls/${process.env.WILDCARD_DOMAIN}/cert.pem`,
      })
    )
    .then(({ Body }) => Body?.transformToByteArray())

  const key = await s3Client
    .send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `tls/${process.env.WILDCARD_DOMAIN}/key.pem`,
      })
    )
    .then(({ Body }) => Body?.transformToByteArray())

  if (!cert || !key) {
    throw new Error('TLS certificate or key not found')
  }

  return {
    cert: Buffer.from(cert),
    key: Buffer.from(key),
  }
}

// cache the TLS certificate for 1 week
const cache = new ExpiryMap(1000 * 60 * 60 * 24 * 7)
export const getTls = pMemoize(_getTls, { cache })

export async function setSecureContext(httpsServer: Server) {
  const tlsOptions = await getTls()
  httpsServer.setSecureContext(tlsOptions)
}

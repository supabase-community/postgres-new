import { GetObjectCommand } from '@aws-sdk/client-s3'
import QuickLRU from 'quick-lru'
import memoize from 'p-memoize'
import { env } from '../env.ts'
import { s3 } from '../lib/s3.ts'

async function _getTlsOptions() {
  const certCommand = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: 'tls/cert.pem' })
  const keyCommand = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: 'tls/key.pem' })
  const [certResponse, keyResponse] = await Promise.all([s3.send(certCommand), s3.send(keyCommand)])

  if (!certResponse.Body || !keyResponse.Body) {
    throw new Error('Certificates not found')
  }

  return {
    cert: Buffer.from(await certResponse.Body.transformToByteArray()),
    key: Buffer.from(await keyResponse.Body.transformToByteArray()),
  }
}

export const getTlsOptions = memoize(_getTlsOptions, {
  // cache for 1 week
  cache: new QuickLRU({ maxSize: 1, maxAge: 1000 * 60 * 60 * 24 * 7 }),
})

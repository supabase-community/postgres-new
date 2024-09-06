import { Buffer } from 'node:buffer'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ forcePathStyle: true })

export async function getTls() {
  const cert = await s3Client
    .send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: 'tls/cert.pem',
      })
    )
    .then(({ Body }) => Body?.transformToByteArray())

  const key = await s3Client
    .send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: 'tls/key.pem',
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

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { decompressArchive } from './decompress-archive.ts'
import { debug } from './debug.ts'

const s3 = new S3Client({ forcePathStyle: true })

export async function getPgData(databaseId: string) {
  debug(`downloading pgdata for database ${databaseId}`)
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `dbs/${databaseId}.tar.gz`,
    })
  )
  debug(`downloaded pgdata for database ${databaseId}`)

  if (!response.Body) {
    throw new Error('No body in response')
  }

  const outputDir = `./pgdata`

  debug(`decompressing pgdata for database ${databaseId}`)
  await decompressArchive(response.Body.transformToWebStream(), outputDir)
  debug(`decompressed pgdata for database ${databaseId}`)

  return outputDir
}

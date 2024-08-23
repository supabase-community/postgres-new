import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { File } from 'node:buffer'

const s3Client = new S3Client()

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: 'No body',
    }
  }

  const databaseId = event.requestContext.domainName.split('.')[0]

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `dbs/${databaseId}.tar.gz`,
    })
  )

  if (!object.Body) {
    return {
      statusCode: 404,
      body: 'Database not found',
    }
  }

  const dataDir = new File([await object.Body.transformToByteArray()], 'pgdata.tar.gz', {
    type: 'application/gzip',
  })

  const database = new PGlite({
    loadDataDir: dataDir,
    extensions: { vector },
  })

  const response = await database.execProtocolRaw(event.body as unknown as Uint8Array)

  return {
    headers: { 'Content-Type': 'application/octet-stream' },
    statusCode: 200,
    body: Buffer.from(response).toString('base64'),
    isBase64Encoded: true,
  }
}

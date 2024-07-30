import { CompleteMultipartUploadCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NextRequest } from 'next/server'
import { entries } from 'streaming-tar'

// The credentials are read from the environment automatically
const s3Client = new S3Client({ endpoint: process.env.S3_ENDPOINT, forcePathStyle: true })

/**
 * Accepts a *.tar.gz database dump and streams contents to an S3-compatible bucket
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.body) {
    return new Response(JSON.stringify({ error: 'Missing request body' }), { status: 400 })
  }

  const databaseId = params.id
  const directoryPrefix = `dbs/${databaseId}`
  const tarEntryStream = req.body.pipeThrough(new DecompressionStream('gzip'))
  const uploads: Promise<CompleteMultipartUploadCommandOutput>[] = []

  for await (const entry of entries(tarEntryStream)) {
    let upload: Upload

    switch (entry.type) {
      case 'file': {
        const buffer = new Uint8Array(await entry.arrayBuffer())
        upload = new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.S3_BUCKET,
            Key: `${directoryPrefix}${entry.name}`,
            Body: buffer,
          },
        })
        break
      }
      case 'directory': {
        // Directories end in '/' and have no body
        upload = new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.S3_BUCKET,
            Key: `${directoryPrefix}${entry.name}/`,
            Body: new Uint8Array(),
          },
        })
        break
      }
      default: {
        continue
      }
    }

    uploads.push(upload.done())
  }

  await Promise.all(uploads)

  return new Response(null, { status: 204 })
}

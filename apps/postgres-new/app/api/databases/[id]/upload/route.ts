import { CompleteMultipartUploadCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NextRequest } from 'next/server'

const wildcardDomain = process.env.WILDCARD_DOMAIN ?? 'db.example.com'

// The credentials are read from the environment automatically
const s3Client = new S3Client({ endpoint: process.env.S3_ENDPOINT, forcePathStyle: true })

/**
 * Accepts a *.tar.gz database dump and streams contents to an S3-compatible bucket
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.body) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing request body',
      }),
      {
        status: 400,
      }
    )
  }

  const databaseId = params.id
  const key = `dbs/${databaseId}.tar.gz`

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: req.body,
    },
  })

  await upload.done()

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        serverName: `${databaseId}.${wildcardDomain}`,
      },
    }),
    { headers: { 'content-type': 'application/json' } }
  )
}
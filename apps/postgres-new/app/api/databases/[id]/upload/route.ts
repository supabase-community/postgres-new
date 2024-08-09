import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NextRequest, NextResponse } from 'next/server'
import { createGzip } from 'zlib'
import { Readable } from 'stream'
import { createClient } from '~/utils/supabase/server'
import { createScramSha256Data } from 'pg-gateway'
import { randomBytes } from 'crypto'

const wildcardDomain = process.env.WILDCARD_DOMAIN ?? 'db.example.com'
const s3Client = new S3Client({ endpoint: process.env.S3_ENDPOINT, forcePathStyle: true })
const supabase = createClient()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    )
  }

  if (!req.body) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing request body',
      },
      {
        status: 400,
      }
    )
  }

  const databaseId = params.id
  const key = `dbs/${databaseId}.tar.gz`

  const gzip = createGzip()
  const body = Readable.from(streamToAsyncIterable(req.body))

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body.pipe(gzip),
    },
  })

  await upload.done()

  const password = generatePostgresPassword()

  await supabase.from('deployed_databases').insert({
    auth_method: 'scram-sha-256',
    auth_data: createScramSha256Data(password),
    database_id: databaseId,
  })

  return NextResponse.json({
    success: true,
    data: {
      username: 'readonly_postgres',
      password,
      serverName: `${databaseId}.${wildcardDomain}`,
    },
  })
}

async function* streamToAsyncIterable(stream: ReadableStream) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

function generatePostgresPassword(length: number = 32): string {
  const validChars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~'
  const bytes = randomBytes(length)
  let password = ''

  for (let i = 0; i < length; i++) {
    password += validChars[bytes[i] % validChars.length]
  }

  return password
}

import { S3Client, CompleteMultipartUploadCommandOutput } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '~/utils/supabase/server'
import { createScramSha256Data } from 'pg-gateway'
import { generateDatabasePassword } from '~/utils/generate-database-password'
import { entries } from 'streaming-tar'

const wildcardDomain = process.env.NEXT_PUBLIC_WILDCARD_DOMAIN ?? 'db.example.com'
const s3Client = new S3Client({ forcePathStyle: true })

export type DatabaseUploadResponse =
  | {
      success: true
      data: {
        username: string
        password?: string
        host: string
        port: number
        databaseName: string
      }
    }
  | {
      success: false
      error: string
    }

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DatabaseUploadResponse>> {
  const supabase = createClient()

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

  const data = await req.formData()

  const dump = data.get('dump') as File | null
  const name = data.get('name') as string | null
  const createdAt = data.get('created_at') as string | null

  if (!dump || !name || !createdAt) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing fields',
      },
      { status: 400 }
    )
  }

  // TODO: we should check the size of the uncompressed tarball
  const dumpSizeInMB = dump.size / (1024 * 1024)
  if (dumpSizeInMB > 100) {
    return NextResponse.json(
      {
        success: false,
        error: "You can't deploy a database that is bigger than 100MB",
      },
      { status: 413 }
    )
  }

  const databaseId = params.id
  const directoryPrefix = `dbs/${databaseId}`
  const tarEntryStream =
    dump.type === 'application/x-gzip'
      ? dump.stream().pipeThrough(new DecompressionStream('gzip'))
      : dump.stream()
  const uploads: Promise<CompleteMultipartUploadCommandOutput>[] = []

  for await (const entry of entries(tarEntryStream)) {
    let upload: Upload

    switch (entry.type) {
      case 'file': {
        const buffer = new Uint8Array(await entry.arrayBuffer())
        upload = new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `${directoryPrefix}${entry.name}`,
            Body: buffer,
          },
        })
        break
      }
      case 'directory': {
        // Directories end in '/' and have an empty body
        upload = new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `${directoryPrefix}${entry.name}/`,
            Body: new Uint8Array(),
          },
        })
        await entry.skip()
        break
      }
      default: {
        continue
      }
    }

    uploads.push(upload.done())
  }

  await Promise.all(uploads)

  const { data: existingDeployedDatabase } = await supabase
    .from('deployed_databases')
    .select('id')
    .eq('database_id', databaseId)
    .maybeSingle()

  let password: string | undefined

  if (existingDeployedDatabase) {
    await supabase
      .from('deployed_databases')
      .update({
        deployed_at: 'now()',
      })
      .eq('database_id', databaseId)
  } else {
    password = generateDatabasePassword()
    await supabase.from('deployed_databases').insert({
      database_id: databaseId,
      name,
      created_at: createdAt,
      auth_method: 'scram-sha-256',
      auth_data: createScramSha256Data(password),
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      username: 'readonly_postgres',
      password,
      host: `${databaseId}.${wildcardDomain}`,
      port: 5432,
      databaseName: 'postgres',
    },
  })
}

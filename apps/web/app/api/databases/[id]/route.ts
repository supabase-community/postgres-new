import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '~/utils/supabase/server'

const s3Client = new S3Client({ endpoint: process.env.S3_ENDPOINT, forcePathStyle: true })

export type DatabaseDeleteResponse =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DatabaseDeleteResponse>> {
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

  const databaseId = params.id

  const { data: existingDeployedDatabase } = await supabase
    .from('deployed_databases')
    .select('id')
    .eq('database_id', databaseId)
    .maybeSingle()

  if (!existingDeployedDatabase) {
    return NextResponse.json(
      {
        success: false,
        error: `Database ${databaseId} was not found`,
      },
      { status: 404 }
    )
  }

  await supabase.from('deployed_databases').delete().eq('database_id', databaseId)

  const key = `dbs/${databaseId}.tar.gz`
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      })
    )
  } catch (error) {
    console.error(`Error deleting S3 object ${key}:`, error)
  }

  return NextResponse.json({
    success: true,
  })
}

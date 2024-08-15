import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '~/utils/supabase/server'

const s3Client = new S3Client({ forcePathStyle: true })

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

  async function recursiveDelete(token?: string) {
    // get the files
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: `dbs/${databaseId}`,
      ContinuationToken: token,
    })
    let list = await s3Client.send(listCommand)
    if (list.KeyCount) {
      // if items to delete
      // delete the files
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Delete: {
          Objects: list.Contents!.map((item) => ({ Key: item.Key })),
          Quiet: false,
        },
      })
      let deleted = await s3Client.send(deleteCommand)

      // log any errors deleting files
      if (deleted.Errors) {
        deleted.Errors.map((error) =>
          console.log(`${error.Key} could not be deleted - ${error.Code}`)
        )
      }
    }
    // repeat if more files to delete
    if (list.NextContinuationToken) {
      await recursiveDelete(list.NextContinuationToken)
    }
  }
  // start the recursive function
  await recursiveDelete()

  return NextResponse.json({
    success: true,
  })
}

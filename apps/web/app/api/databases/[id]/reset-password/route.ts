import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '~/utils/supabase/server'
import { createScramSha256Data } from 'pg-gateway'
import { generateDatabasePassword } from '~/utils/generate-database-password'

export type DatabaseResetPasswordResponse =
  | {
      success: true
      data: {
        password: string
      }
    }
  | {
      success: false
      error: string
    }

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DatabaseResetPasswordResponse>> {
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

  const password = generateDatabasePassword()

  await supabase
    .from('deployed_databases')
    .update({
      auth_data: createScramSha256Data(password),
    })
    .eq('database_id', databaseId)

  return NextResponse.json({
    success: true,
    data: {
      password,
    },
  })
}

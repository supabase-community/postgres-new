import { createClient as createAdminClient } from '~/utils/supabase/admin'
import { createClient } from '~/utils/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.getUser()

  // We have middleware, so this should never happen (used for type narrowing)
  if (error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user } = data

  const supabaseAdmin = createAdminClient()

  // get user's refresh token for Supabase
  const { data: database, error: databaseError } = await supabaseAdmin
    .from('vault')
    .select('*')
    .eq('id', databaseId)
    .single()
}

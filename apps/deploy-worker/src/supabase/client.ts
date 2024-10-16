import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './db-types.ts'

export const supabaseAdmin = createSupabaseClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function createClient() {
  return createSupabaseClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
}

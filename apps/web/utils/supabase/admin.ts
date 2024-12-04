import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './db-types'

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

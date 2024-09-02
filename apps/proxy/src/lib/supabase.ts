import type { Database } from '@postgres-new/supabase'
import { createClient } from '@supabase/supabase-js'
import { env } from '../env.ts'

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

import { supabase } from '../lib/supabase.ts'
import memoize from 'p-memoize'
import QuickLRU from 'quick-lru'

async function _getDeployedDatabase(databaseId: string) {
  return await supabase
    .from('deployed_databases')
    .select('auth_method, auth_data')
    .eq('database_id', databaseId!)
    .single()
}

export const getDeployedDatabase = memoize(_getDeployedDatabase, {
  // cache for 5 minutes
  cache: new QuickLRU({ maxSize: 1000, maxAge: 1000 * 60 * 5 }),
})

/**
 * Supabase built-in schemas that will be excluded from the
 * deployment if they exist in the source database.
 */
export const SUPABASE_SCHEMAS = [
  'auth',
  'cron',
  'extensions',
  'graphql',
  'graphql_public',
  'net',
  'pgbouncer',
  'pgsodium',
  'pgsodium_masks',
  'realtime',
  'storage',
  'supabase_functions',
  'supabase_migrations',
  'vault',
]

import { supabaseAdmin } from './client.ts'
import type { SupabaseProviderMetadata } from './types.ts'

/**
 * Get the database url for a given Supabase project.
 */
export async function getDatabaseUrl(params: { project: SupabaseProviderMetadata['project'] }) {
  const databasePasswordSecret = await supabaseAdmin.rpc('read_secret', {
    secret_id: params.project.database.password,
  })

  if (databasePasswordSecret.error) {
    throw new Error('Cannot read database password secret', {
      cause: databasePasswordSecret.error,
    })
  }

  const { database } = params.project

  return `postgresql://${database.user}:${databasePasswordSecret.data}@${database.host}:${database.port}/${database.name}`
}

import { DeployError } from '../error.ts'
import { supabaseAdmin } from './client.ts'
import type { SupabaseProviderMetadata } from './types.ts'

/**
 * Get the database url for a given Supabase project.
 */
export async function getDatabaseUrl(params: {
  project: SupabaseProviderMetadata['project']
  hidePassword?: boolean
}) {
  let password = '[YOUR-PASSWORD]'
  if (!params.hidePassword) {
    const databasePasswordSecret = await supabaseAdmin.rpc('read_secret', {
      secret_id: params.project.database.password,
    })

    if (databasePasswordSecret.error) {
      throw new DeployError('Cannot read database password secret', {
        cause: databasePasswordSecret.error,
      })
    }

    password = databasePasswordSecret.data
  }

  const { database } = params.project

  return `postgresql://${database.user}:${password}@${database.host}:${database.port}/${database.name}`
}

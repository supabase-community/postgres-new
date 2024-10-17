import { supabaseAdmin, type createClient } from './client.ts'
import type { SupabaseClient, SupabaseProviderMetadata } from './types.ts'
import { exec as execSync } from 'node:child_process'
import { promisify } from 'node:util'
import { createDeployedDatabase } from './create-deployed-database.ts'
import { getDatabaseUrl } from './get-database-url.ts'
const exec = promisify(execSync)

/**
 * Deploy a local database on Supabase
 * If the database was already deployed, it will overwrite the existing database data
 */
export async function deploy(
  ctx: { supabase: SupabaseClient },
  params: { databaseId: string; integrationId: number; localDatabaseUrl: string }
) {
  // check if the database was already deployed
  const deployedDatabase = await ctx.supabase
    .from('deployed_databases')
    .select('*')
    .eq('local_database_id', params.databaseId)
    .eq('deployment_provider_integration_id', params.integrationId)
    .maybeSingle()

  if (deployedDatabase.error) {
    throw new Error('Cannot find deployed database', { cause: deployedDatabase.error })
  }

  if (!deployedDatabase.data) {
    deployedDatabase.data = await createDeployedDatabase(
      { supabase: ctx.supabase },
      { databaseId: params.databaseId, integrationId: params.integrationId }
    )
  }

  // get the database url
  const databaseUrl = await getDatabaseUrl({
    project: (deployedDatabase.data.provider_metadata as SupabaseProviderMetadata).project,
  })

  // use pg_dump and pg_restore to transfer the data from the local database to the remote database
  const command = `pg_dump "${params.localDatabaseUrl}" -Fc | pg_restore -d "${databaseUrl}" --clean --if-exists`
  console.log(command)
  try {
    await exec(command)
  } catch (error) {
    throw new Error('Cannot transfer the data from the local database to the remote database', {
      cause: error,
    })
  }

  return {
    databaseUrl,
  }
}

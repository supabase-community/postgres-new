import { supabaseAdmin, type createClient } from './client.ts'
import type { SupabaseClient, SupabaseProviderMetadata } from './types.ts'
import { exec as execSync } from 'node:child_process'
import { promisify } from 'node:util'
import { createDeployedDatabase } from './create-deployed-database.ts'
import { getDatabaseUrl } from './get-database-url.ts'
import { DeployError } from '../error.ts'
const exec = promisify(execSync)

/**
 * Deploy a local database on Supabase
 * If the database was already deployed, it will overwrite the existing database data
 */
export async function deploy(
  ctx: { supabase: SupabaseClient },
  params: { databaseId: string; integrationId: number; localDatabaseUrl: string }
) {
  const { data: deployment, error: createDeploymentError } = await ctx.supabase
    .from('deployments')
    .insert({
      local_database_id: params.databaseId,
    })
    .select('id')
    .single()

  if (createDeploymentError) {
    if (createDeploymentError.code === '23505') {
      throw new DeployError('Deployment already in progress', { cause: createDeploymentError })
    }

    throw new DeployError('Cannot create deployment', { cause: createDeploymentError })
  }

  let isRedeploy = false

  try {
    // check if the database was already deployed
    const deployedDatabase = await ctx.supabase
      .from('deployed_databases')
      .select('*')
      .eq('local_database_id', params.databaseId)
      .eq('deployment_provider_integration_id', params.integrationId)
      .maybeSingle()

    if (deployedDatabase.error) {
      throw new DeployError('Cannot find deployed database', { cause: deployedDatabase.error })
    }

    if (!deployedDatabase.data) {
      deployedDatabase.data = await createDeployedDatabase(
        { supabase: ctx.supabase },
        { databaseId: params.databaseId, integrationId: params.integrationId }
      )
    } else {
      isRedeploy = true
    }

    const { error: linkDeploymentError } = await ctx.supabase
      .from('deployments')
      .update({
        deployed_database_id: deployedDatabase.data.id,
      })
      .eq('id', deployment.id)

    if (linkDeploymentError) {
      throw new DeployError('Cannot link deployment with deployed database', {
        cause: linkDeploymentError,
      })
    }

    const project = (deployedDatabase.data.provider_metadata as SupabaseProviderMetadata).project

    // get the database url
    const databaseUrl = await getDatabaseUrl({
      project,
    })

    // use pg_dump and pg_restore to transfer the data from the local database to the remote database
    const command = `pg_dump "${params.localDatabaseUrl}" -Fc | pg_restore -d "${databaseUrl}" --clean --if-exists`

    try {
      await exec(command)
    } catch (error) {
      throw new DeployError(
        'Cannot transfer the data from the local database to the remote database',
        {
          cause: error,
        }
      )
    }

    await ctx.supabase
      .from('deployments')
      .update({
        status: 'success',
      })
      .eq('id', deployment.id)

    return {
      name: project.name,
      url: `https://supabase.com/dashboard/project/${project.id}`,
      databaseUrl: await getDatabaseUrl({ project, hidePassword: isRedeploy }),
      isRedeploy,
    }
  } catch (error) {
    await ctx.supabase
      .from('deployments')
      .update({
        status: 'failed',
      })
      .eq('id', deployment.id)

    throw error
  }
}

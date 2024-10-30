import type { SupabaseClient, SupabaseProviderMetadata } from './types.ts'
import { exec as execSync } from 'node:child_process'
import { promisify } from 'node:util'
import { createDeployedDatabase } from './create-deployed-database.ts'
import { getDatabaseUrl, getPoolerUrl } from './get-database-url.ts'
import { DeployError, IntegrationRevokedError } from '../error.ts'
import { generatePassword } from './generate-password.ts'
import { getAccessToken } from './get-access-token.ts'
import { createManagementApiClient } from './management-api/client.ts'
const exec = promisify(execSync)

/**
 * Deploy a local database on Supabase
 * If the database was already deployed, it will overwrite the existing database data
 */
export async function deploy(
  ctx: { supabase: SupabaseClient },
  params: { databaseId: string; integrationId: number; localDatabaseUrl: string }
) {
  // check if the integration is still active
  const integration = await ctx.supabase
    .from('deployment_provider_integrations')
    .select('*')
    .eq('id', params.integrationId)
    .single()

  if (integration.error) {
    throw new DeployError('Integration not found', { cause: integration.error })
  }

  if (integration.data.revoked_at) {
    throw new IntegrationRevokedError()
  }

  const accessToken = await getAccessToken({
    integrationId: params.integrationId,
    // the integration isn't revoked, so it must have credentials
    credentialsSecretId: integration.data.credentials!,
  })

  const managementApiClient = createManagementApiClient(accessToken)

  // this is just to check if the integration is still active, an IntegrationRevokedError will be thrown if not
  await managementApiClient.GET('/v1/organizations')

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

    let databasePassword: string | undefined

    if (!deployedDatabase.data) {
      const createdDeployedDatabase = await createDeployedDatabase(
        { supabase: ctx.supabase },
        { databaseId: params.databaseId, integrationId: params.integrationId }
      )

      deployedDatabase.data = createdDeployedDatabase.deployedDatabase
      databasePassword = createdDeployedDatabase.databasePassword
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

    // create temporary credentials to restore the Supabase database
    const remoteDatabaseUser = `db_build_${generatePassword()}`
    const remoteDatabasePassword = generatePassword()
    const createUserResponse = await managementApiClient.POST('/v1/projects/{ref}/database/query', {
      body: {
        query: `create user "${remoteDatabaseUser}" with password '${remoteDatabasePassword}' in role postgres`,
      },
      params: {
        path: {
          ref: project.id,
        },
      },
    })

    if (createUserResponse.error) {
      throw new DeployError('Cannot create temporary role for deployment', {
        cause: createUserResponse.error,
      })
    }

    const remoteDatabaseUrl = getDatabaseUrl({
      project,
      databaseUser: remoteDatabaseUser,
      databasePassword: remoteDatabasePassword,
    })

    const excludedSchemas = [
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
      .map((schema) => `--exclude-schema=${schema}`)
      .join(' ')

    // use pg_dump and pg_restore to transfer the data from the local database to the remote database
    const command = `pg_dump "${params.localDatabaseUrl}" -Fc ${excludedSchemas} -Z 0 | pg_restore -d "${remoteDatabaseUrl}" --clean --if-exists`

    try {
      await exec(command)
    } catch (error) {
      throw new DeployError(
        'Cannot transfer the data from the local database to the remote database',
        {
          cause: error,
        }
      )
    } finally {
      // delete the temporary credentials
      const deleteUserResponse = await managementApiClient.POST(
        '/v1/projects/{ref}/database/query',
        {
          body: {
            query: `drop user "${remoteDatabaseUser}";`,
          },
          params: {
            path: { ref: project.id },
          },
        }
      )

      if (deleteUserResponse.error) {
        throw new DeployError('Cannot delete temporary role for deployment', {
          cause: deleteUserResponse.error,
        })
      }
    }

    await ctx.supabase
      .from('deployments')
      .update({
        status: 'success',
      })
      .eq('id', deployment.id)

    return {
      name: project.name,
      url: `${process.env.SUPABASE_PLATFORM_URL}/dashboard/project/${project.id}`,
      databasePassword,
      databaseUrl: getDatabaseUrl({ project, databasePassword }),
      poolerUrl: getPoolerUrl({ project, databasePassword }),
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

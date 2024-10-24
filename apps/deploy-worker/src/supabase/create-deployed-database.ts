import { DeployError } from '../error.ts'
import { supabaseAdmin } from './client.ts'
import { generatePassword } from './generate-password.ts'
import { getAccessToken } from './get-access-token.ts'
import { createManagementApiClient } from './management-api/client.ts'
import type { Credentials, SupabaseClient, SupabaseProviderMetadata } from './types.ts'
import { waitForDatabaseToBeHealthy, waitForProjectToBeHealthy } from './wait-for-health.ts'

/**
 * Create a new project on Supabase and store the relevant metadata in the database.
 */
export async function createDeployedDatabase(
  ctx: {
    supabase: SupabaseClient
  },
  params: {
    databaseId: string
    integrationId: number
  }
) {
  const integration = await ctx.supabase
    .from('deployment_provider_integrations')
    .select('id,credentials,scope')
    .eq('id', params.integrationId)
    .single()

  if (integration.error) {
    throw new DeployError('Cannot find integration', { cause: integration.error })
  }

  // first we need to create a new project on Supabase using the Management API
  const credentials = integration.data.credentials as Credentials

  const accessToken = await getAccessToken(
    {
      supabase: ctx.supabase,
    },
    {
      integrationId: integration.data.id,
      credentials,
    }
  )

  const managementApiClient = createManagementApiClient(accessToken)

  const databasePassword = generatePassword()

  // create a new project on Supabase using the Management API
  const { data: createdProject, error: createdProjectError } = await managementApiClient.POST(
    '/v1/projects',
    {
      body: {
        db_pass: databasePassword,
        name: `database-build-${params.databaseId}`,
        organization_id: (integration.data.scope as { organizationId: string }).organizationId,
        region: 'us-east-1',
      },
    }
  )

  if (createdProjectError) {
    throw new DeployError('Failed to create project on Supabase', {
      cause: createdProjectError,
    })
  }

  await waitForProjectToBeHealthy({ managementApiClient }, { project: createdProject })

  await waitForDatabaseToBeHealthy({ managementApiClient }, { project: createdProject })

  // get the pooler details
  const { data: pooler, error: poolerError } = await managementApiClient.GET(
    '/v1/projects/{ref}/config/database/pooler',
    {
      params: {
        path: {
          ref: createdProject.id,
        },
      },
    }
  )

  if (poolerError) {
    throw new DeployError('Failed to get pooler details', {
      cause: poolerError,
    })
  }

  const primaryDatabase = pooler.find((db) => db.database_type === 'PRIMARY')

  if (!primaryDatabase) {
    throw new DeployError('Primary database not found')
  }

  // store the database password as a secret
  const databasePasswordSecret = await supabaseAdmin.rpc('insert_secret', {
    name: `supabase_database_password_${params.databaseId}`,
    secret: databasePassword,
  })

  if (databasePasswordSecret.error) {
    throw new DeployError('Cannot store database password as secret', {
      cause: databasePasswordSecret.error,
    })
  }

  const metadata: SupabaseProviderMetadata = {
    project: {
      id: createdProject.id,
      organizationId: createdProject.organization_id,
      name: createdProject.name,
      region: createdProject.region,
      createdAt: createdProject.created_at,
      database: {
        host: primaryDatabase.db_host,
        name: primaryDatabase.db_name,
        password: databasePasswordSecret.data,
        // use session mode for prepared statements
        port: 5432,
        user: primaryDatabase.db_user,
      },
    },
  }

  const deployedDatabase = await ctx.supabase
    .from('deployed_databases')
    .insert({
      deployment_provider_integration_id: integration.data.id,
      local_database_id: params.databaseId,
      provider_metadata: metadata,
    })
    .select()
    .single()

  if (deployedDatabase.error) {
    throw new DeployError('Cannot create deployed database', { cause: deployedDatabase.error })
  }

  return deployedDatabase.data
}

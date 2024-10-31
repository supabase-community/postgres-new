import { DeployError } from '../error.ts'
import { generatePassword } from './generate-password.ts'
import { getAccessToken } from './get-access-token.ts'
import { createManagementApiClient } from './management-api/client.ts'
import type { SupabaseClient, SupabaseProviderMetadata } from './types.ts'
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

  // It should be impossible to reach this state
  if (!integration.data.credentials) {
    throw new DeployError('The integration was revoked')
  }

  // first we need to create a new project on Supabase using the Management API
  const accessToken = await getAccessToken({
    integrationId: integration.data.id,
    credentialsSecretId: integration.data.credentials,
  })

  const managementApiClient = createManagementApiClient(accessToken)

  const databasePassword = generatePassword()

  const projectName = `database-build-${params.databaseId}`

  // check if the project already exists on Supabase
  const {
    data: projects,
    error: getProjectsError,
    response,
  } = await managementApiClient.GET('/v1/projects')

  if (getProjectsError) {
    console.log(response)
    throw new DeployError('Failed to get projects from Supabase', {
      cause: getProjectsError,
    })
  }

  const existingProject = projects.find((p) => p.name === projectName)

  if (existingProject) {
    throw new DeployError(`A project with this name ${projectName} already exists on Supabase`, {
      cause: existingProject,
    })
  }

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

  const project = await waitForProjectToBeHealthy(
    { managementApiClient },
    { project: createdProject }
  )

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

  const primaryDatabase = pooler!.find((db) => db.database_type === 'PRIMARY')

  if (!primaryDatabase) {
    throw new DeployError('Primary database not found')
  }

  const metadata: SupabaseProviderMetadata = {
    project: {
      id: createdProject.id,
      organizationId: createdProject.organization_id,
      name: createdProject.name,
      region: createdProject.region,
      createdAt: createdProject.created_at,
      database: {
        host: project!.database!.host,
        name: 'postgres',
        port: 5432,
        user: 'postgres',
      },
      pooler: {
        host: primaryDatabase.db_host,
        name: primaryDatabase.db_name,
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

  return {
    deployedDatabase: deployedDatabase.data,
    databasePassword,
  }
}
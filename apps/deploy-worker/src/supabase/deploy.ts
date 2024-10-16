import { supabaseAdmin, type createClient } from './client.ts'
import { getAccessToken } from './oauth.ts'
import { waitForDatabaseToBeReady } from './wait-for-database-to-be-ready.ts'
import type { Project, SupabaseProviderMetadata } from './types.ts'
import { generatePassword } from './generate-password.ts'
import { exec as execSync } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execSync)

type Context = {
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function deployOnSupabase(
  ctx: Context,
  params: { databaseId: string; integrationId: string; localDatabaseUrl: string }
) {
  // check if there is the database was already deployed
  let deployedDatabase = await ctx.supabase
    .from('deployed_databases')
    .select('*')
    .eq('local_database_id', params.databaseId)
    .eq('deployment_provider_integration_id', params.integrationId)
    .maybeSingle()

  if (deployedDatabase.error) {
    throw new Error('Cannot find deployed database', { cause: deployedDatabase.error })
  }

  if (!deployedDatabase.data) {
    const integration = await ctx.supabase
      .from('deployment_provider_integrations')
      .select('id,credentials,scope')
      .eq('id', params.integrationId)
      .single()

    if (integration.error) {
      throw new Error('Cannot find integration', { cause: integration.error })
    }

    // first we need to create a new project on Supabase using the Management API
    const credentials = integration.data.credentials as {
      expiresAt: string
      refreshToken: string
      accessToken: string
    }

    const accessToken = await getAccessToken(integration.data.id, credentials)

    const databasePassword = generatePassword()

    // create a new project on Supabase using the Management API
    const projectResponse = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        db_pass: databasePassword,
        name: `database-build-${params.databaseId}`,
        organization_id: (integration.data.scope as { organizationId: string }).organizationId,
        region: 'us-east-1',
        desired_instance_size: 'micro',
      }),
    })

    if (!projectResponse.ok) {
      throw new Error('Failed to create project on Supabase', {
        cause: {
          status: projectResponse.status,
          statusText: projectResponse.statusText,
        },
      })
    }

    const project = (await projectResponse.json()) as Project

    // wait for the database to be ready
    await waitForDatabaseToBeReady(project, accessToken)

    // store the database password as a secret
    const databasePasswordSecret = await supabaseAdmin.rpc('insert_secret', {
      name: `supabase_database_password_${params.databaseId}`,
      secret: databasePassword,
    })

    if (databasePasswordSecret.error) {
      throw new Error('Cannot store database password as secret', {
        cause: databasePasswordSecret.error,
      })
    }

    const metadata: SupabaseProviderMetadata = {
      project: {
        ...project,
        database: {
          ...project.database,
          password: databasePasswordSecret.data,
        },
      },
    }

    deployedDatabase = await ctx.supabase
      .from('deployed_databases')
      .insert({
        deployment_provider_integration_id: integration.data.id,
        local_database_id: params.databaseId,
        provider_metadata: metadata,
      })
      .select()
      .single()

    if (deployedDatabase.error) {
      throw new Error('Cannot create deployed database', { cause: deployedDatabase.error })
    }
  }

  // get the remote database url
  const { project } = deployedDatabase.data!.provider_metadata as SupabaseProviderMetadata

  const databasePasswordSecret = await supabaseAdmin.rpc('read_secret', {
    secret_id: project.database.password,
  })

  if (databasePasswordSecret.error) {
    throw new Error('Cannot read database password secret', {
      cause: databasePasswordSecret.error,
    })
  }

  const remoteDatabaseUrl = `postgresql://postgres.${project.id}:${databasePasswordSecret.data}@${project.database.host}:5432/postgres`

  // use pg_dump and pg_restore to transfer the data from the local database to the remote database
  const command = `pg_dump "${params.localDatabaseUrl}" -Fc -C | pg_restore --dbname=${remoteDatabaseUrl}`
  try {
    await exec(command)
  } catch (error) {
    throw new Error('Cannot transfer the data from the local database to the remote database', {
      cause: error,
    })
  }

  return {
    databaseUrl: remoteDatabaseUrl,
  }
}

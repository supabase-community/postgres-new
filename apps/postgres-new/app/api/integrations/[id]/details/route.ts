import { IntegrationRevokedError } from '@database.build/deploy'
import {
  createManagementApiClient,
  getAccessToken,
  revokeIntegration,
  SupabasePlatformConfig,
} from '@database.build/deploy/supabase'
import { createAdminClient, createClient } from '~/utils/supabase/server'

export type IntegrationDetails = {
  id: number
  provider: {
    id: number
    name: string
  }
  organization: {
    id: string
    name: string
  }
}

const supabasePlatformConfig: SupabasePlatformConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL!,
  apiUrl: process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_API_URL!,
  oauthClientId: process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID!,
  oauthSecret: process.env.SUPABASE_OAUTH_SECRET!,
}

/**
 * Gets the details of an integration by querying the Supabase
 * management API. Details include the organization ID and name
 * that the integration is scoped to.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const supabaseAdmin = createAdminClient()

  const ctx = {
    supabase,
    supabaseAdmin,
    supabasePlatformConfig,
  }

  const integrationId = parseInt(id, 10)

  try {
    const { data: integration, error: getIntegrationError } = await supabase
      .from('deployment_provider_integrations')
      .select('*, provider:deployment_providers!inner(id, name)')
      .eq('id', integrationId)
      .single()

    if (getIntegrationError) {
      throw new Error('Integration not found', { cause: getIntegrationError })
    }

    if (integration.revoked_at) {
      throw new IntegrationRevokedError()
    }

    const credentialsSecretId = integration.credentials

    if (!credentialsSecretId) {
      throw new Error('Integration has no credentials')
    }

    if (!integration.scope) {
      throw new Error('Integration has no scope')
    }

    if (
      typeof integration.scope !== 'object' ||
      !('organizationId' in integration.scope) ||
      typeof integration.scope.organizationId !== 'string'
    ) {
      throw new Error('Integration scope is invalid')
    }

    const accessToken = await getAccessToken(ctx, {
      integrationId: integration.id,
      credentialsSecretId,
    })

    const managementApiClient = createManagementApiClient(ctx, accessToken)

    const { data: organization, error: getOrgError } = await managementApiClient.GET(
      `/v1/organizations/{slug}`,
      {
        params: {
          path: {
            slug: integration.scope.organizationId,
          },
        },
      }
    )

    if (getOrgError) {
      throw new Error('Failed to retrieve organization', { cause: getOrgError })
    }

    const integrationDetails: IntegrationDetails = {
      id: integration.id,
      provider: {
        id: integration.provider.id,
        name: integration.provider.name,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    }

    return Response.json(integrationDetails)
  } catch (error: unknown) {
    console.error(error)

    if (error instanceof IntegrationRevokedError) {
      await revokeIntegration(ctx, { integrationId })
      return Response.json({ message: error.message }, { status: 406 })
    }

    if (error instanceof Error) {
      return Response.json({ message: error.message }, { status: 400 })
    }

    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}

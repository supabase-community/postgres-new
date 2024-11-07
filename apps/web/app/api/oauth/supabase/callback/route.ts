import { createClient } from '~/utils/supabase/server'
import { createClient as createAdminClient } from '~/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Credentials = {
  refreshToken: string
  accessToken: string
  expiresAt: string
}

/**
 * This route is used to handle the callback from Supabase OAuth App integration.
 * It will exchange the oauth code for tokens and create or update a deployment integration against the given provider.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()

  const getUserResponse = await supabase.auth.getUser()

  // We have middleware, so this should never happen (used for type narrowing)
  if (getUserResponse.error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user } = getUserResponse.data

  const code = req.nextUrl.searchParams.get('code') as string | null

  if (!code) {
    return new Response('No code provided', { status: 400 })
  }

  const stateParam = req.nextUrl.searchParams.get('state')

  if (!stateParam) {
    return new Response('No state provided', { status: 400 })
  }

  const state = JSON.parse(stateParam)

  if (!state.databaseId) {
    return new Response('No database id provided', { status: 400 })
  }

  const now = Date.now()

  // get tokens
  const tokensResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_API_URL}/v1/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID}:${process.env.SUPABASE_OAUTH_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: req.nextUrl.origin + '/api/oauth/supabase/callback',
      }),
    }
  )

  if (!tokensResponse.ok) {
    return new Response('Failed to get tokens', { status: 500 })
  }

  const tokens = (await tokensResponse.json()) as {
    access_token: string
    refresh_token: string
    // usually 86400 seconds = 1 day
    expires_in: number
    token_type: 'Bearer'
  }

  console.log({ tokens })

  const organizationsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_API_URL}/v1/organizations`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
    }
  )

  if (!organizationsResponse.ok) {
    return new Response('Failed to get organizations', { status: 500 })
  }

  const [organization] = (await organizationsResponse.json()) as {
    id: string
    name: string
  }[]

  if (!organization) {
    return new Response('Organization not found', { status: 404 })
  }

  // store the credentials and relevant metadata
  const getDeploymentProviderResponse = await supabase
    .from('deployment_providers')
    .select('id')
    .eq('name', 'Supabase')
    .single()

  if (getDeploymentProviderResponse.error) {
    return new Response('Failed to get deployment provider', { status: 500 })
  }

  // check if an existing revoked integration exists with the same organization id
  const getRevokedIntegrationsResponse = await supabase
    .from('deployment_provider_integrations')
    .select('id,scope')
    .eq('deployment_provider_id', getDeploymentProviderResponse.data.id)
    .not('revoked_at', 'is', null)

  if (getRevokedIntegrationsResponse.error) {
    return new Response('Failed to get revoked integrations', { status: 500 })
  }

  const revokedIntegration = getRevokedIntegrationsResponse.data.find(
    (ri) => (ri.scope as { organizationId: string }).organizationId === organization.id
  )

  const adminClient = createAdminClient()

  // store the tokens as secret
  const credentialsSecret = await adminClient.rpc('insert_secret', {
    name: `oauth_credentials_supabase_${organization.id}_${user.id}`,
    secret: JSON.stringify({
      accessToken: tokens.access_token,
      expiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
      refreshToken: tokens.refresh_token,
    }),
  })

  if (credentialsSecret.error) {
    return new Response('Failed to store the integration credentials as secret', { status: 500 })
  }

  let integrationId: number

  // if an existing revoked integration exists, update the tokens and cancel the revokation
  if (revokedIntegration) {
    const updateIntegrationResponse = await supabase
      .from('deployment_provider_integrations')
      .update({
        credentials: credentialsSecret.data,
        revoked_at: null,
      })
      .eq('id', revokedIntegration.id)

    if (updateIntegrationResponse.error) {
      return new Response('Failed to update integration', { status: 500 })
    }

    integrationId = revokedIntegration.id
  } else {
    const createIntegrationResponse = await supabase
      .from('deployment_provider_integrations')
      .insert({
        deployment_provider_id: getDeploymentProviderResponse.data.id,
        credentials: credentialsSecret.data,
        scope: {
          organizationId: organization.id,
        },
      })
      .select('id')
      .single()

    if (createIntegrationResponse.error) {
      return new Response('Failed to create integration', { status: 500 })
    }

    integrationId = createIntegrationResponse.data.id
  }

  const params = new URLSearchParams({
    integration: integrationId.toString(),
  })

  return NextResponse.redirect(new URL(`/deploy/${state.databaseId}?${params.toString()}`, req.url))
}

import { createClient } from '~/utils/supabase/server'
import { createClient as createAdminClient } from '~/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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
  const tokensResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
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
  })

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

  const organizationsResponse = await fetch('https://api.supabase.com/v1/organizations', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokens.access_token}`,
    },
  })

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

  const adminClient = createAdminClient()

  // store the tokens as secrets
  const createRefreshTokenSecret = adminClient.rpc('insert_secret', {
    name: `supabase_oauth_refresh_token_${organization.id}_${user.id}`,
    secret: tokens.refresh_token,
  })
  const createAccessTokenSecret = adminClient.rpc('insert_secret', {
    name: `supabase_oauth_access_token_${organization.id}_${user.id}`,
    secret: tokens.access_token,
  })

  const [createRefreshTokenSecretResponse, createAccessTokenSecretResponse] = await Promise.all([
    createRefreshTokenSecret,
    createAccessTokenSecret,
  ])

  if (createRefreshTokenSecretResponse.error) {
    return new Response('Failed to store refresh token as secret', { status: 500 })
  }

  if (createAccessTokenSecretResponse.error) {
    return new Response('Failed to store access token as secret', { status: 500 })
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

  const createIntegrationResponse = await supabase
    .from('deployment_provider_integrations')
    .insert({
      deployment_provider_id: getDeploymentProviderResponse.data.id,
      credentials: {
        accessToken: createAccessTokenSecretResponse.data,
        expiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
        refreshToken: createRefreshTokenSecretResponse.data,
      },
      scope: {
        organizationId: organization.id,
      },
    })
    .select('id')
    .single()

  if (createIntegrationResponse.error) {
    return new Response('Failed to create integration', { status: 500 })
  }

  const params = new URLSearchParams({
    integration: createIntegrationResponse.data.id.toString(),
  })

  return NextResponse.redirect(new URL(`/deploy/${state.databaseId}?${params.toString()}`, req.url))
}

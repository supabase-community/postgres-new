import { createClient } from '~/utils/supabase/server'
import { createClient as createAdminClient } from '~/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.getUser()

  // We have middleware, so this should never happen (used for type narrowing)
  if (error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user } = data

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

  const tokens = (await tokensResponse.json()) as {
    access_token: string
    refresh_token: string
    // usually 86400 seconds = 1 day
    expires_in: number
    token_type: 'Bearer'
  }

  // get org
  const [org] = (await fetch('https://api.supabase.com/v1/organizations', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokens.access_token}`,
    },
  }).then((res) => res.json())) as {
    id: string
    name: string
  }[]

  const adminClient = createAdminClient()

  // store the tokens as secrets
  const { data: refreshTokenSecretId, error: refreshTokenSecretError } = await adminClient.rpc(
    'insert_secret',
    {
      name: `supabase_oauth_refresh_token_${org.id}`,
      secret: tokens.refresh_token,
    }
  )

  if (refreshTokenSecretError) {
    return new Response('Failed to store refresh token as secret', { status: 500 })
  }
  const { data: accessTokenSecretId, error: accessTokenSecretError } = await adminClient.rpc(
    'insert_secret',
    {
      name: `supabase_oauth_access_token_${org.id}`,
      secret: tokens.access_token,
    }
  )

  if (accessTokenSecretError) {
    return new Response('Failed to store access token as secret', { status: 500 })
  }

  // store the credentials and relevant metadata
  const { data: deploymentProvider, error: deploymentProviderError } = await supabase
    .from('deployment_providers')
    .select('id')
    .eq('name', 'Supabase')
    .single()

  if (deploymentProviderError) {
    return new Response('Failed to get deployment provider', { status: 500 })
  }

  const integration = await supabase
    .from('deployment_provider_integrations')
    .insert({
      deployment_provider_id: deploymentProvider.id,
      credentials: {
        accessToken: accessTokenSecretId,
        expiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
        refreshToken: refreshTokenSecretId,
      },
      scope: {
        organizationId: org.id,
      },
    })
    .select('id')
    .single()

  if (integration.error) {
    return new Response('Failed to create integration', { status: 500 })
  }

  const params = new URLSearchParams({
    integration: integration.data.id.toString(),
  })

  return NextResponse.redirect(new URL(`/deploy/${state.databaseId}?${params.toString()}`, req.url))
}

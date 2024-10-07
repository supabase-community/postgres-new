import { createClient } from '~/utils/supabase/server'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function POST(req: Request) {
  const { data, error } = await supabase.auth.getUser()

  // We have middleware, so this should never happen (used for type narrowing)
  if (error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user } = data

  const { providerId, databaseId } = await req.json()

  // get provider
  const providerResult = await supabase
    .from('deployment_providers')
    .select('*')
    .eq('id', providerId)
    .single()

  if (providerResult.error) {
    return NextResponse.json(
      { code: 'error_fetching_provider', message: providerResult.error },
      { status: 500 }
    )
  }

  // We will eventually support more providers, but for now, we only support Supabase
  if (providerResult.data.name !== 'Supabase') {
    return NextResponse.json(
      { code: 'provider_not_supported', message: 'Provider not supported' },
      { status: 400 }
    )
  }

  // Get the user's refresh token for Supabase
  const deploymentProviderIntegrationResult = await supabase
    .from('deployment_provider_integrations')
    .select('id, credentials')
    .eq('deployment_provider_id', providerId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (deploymentProviderIntegrationResult.error) {
    return NextResponse.json(
      {
        code: 'error_fetching_provider_credentials',
        message: deploymentProviderIntegrationResult.error,
      },
      { status: 500 }
    )
  }

  // First time setup, tell the client to initiate the OAuth flow to get the refresh token
  if (deploymentProviderIntegrationResult.data === null) {
    return NextResponse.json(
      {
        code: 'oauth_required',
        message: 'OAuth flow needs to be initiated',
      },
      { status: 428 }
    )
  }

  const refreshToken = (
    deploymentProviderIntegrationResult.data.credentials as null | { refreshToken: string }
  )?.refreshToken

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'refresh_token_not_found', message: 'Refresh token not found' },
      { status: 400 }
    )
  }

  // exchange the refresh token for an access token
  const response = await fetch('https://api.supabase.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID!,
      client_secret: process.env.SUPABASE_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  })

  if (response.status >= 400) {
    return NextResponse.json(
      { code: 'error_exchanging_refresh_token', message: response.statusText },
      { status: response.status }
    )
  }

  const refreshTokenResponse = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: 'Bearer'
  }

  // Update the refresh token in the database
  await supabase
    .from('deployment_provider_integrations')
    .update({
      credentials: {
        refreshToken: refreshTokenResponse.refresh_token,
      },
    })
    .eq('id', deploymentProviderIntegrationResult.data.id)

  // TODO: Store the access token in the database as well?

  // Create
}

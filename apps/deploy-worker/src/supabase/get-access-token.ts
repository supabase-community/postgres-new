import { supabaseAdmin } from './client.ts'
import type { Credentials, SupabaseClient } from './types.ts'

/**
 * Get the access token for a given Supabase integration.
 */
export async function getAccessToken(
  ctx: { supabase: SupabaseClient },
  params: {
    integrationId: number
    credentials: Credentials
  }
): Promise<string> {
  // if the token expires in less than 1 hour, refresh it
  if (new Date(params.credentials.expiresAt) < new Date(Date.now() + 1 * 60 * 60 * 1000)) {
    const refreshToken = await supabaseAdmin.rpc('read_secret', {
      secret_id: params.credentials.refreshToken,
    })

    if (refreshToken.error) {
      throw new Error('Failed to read refresh token', { cause: refreshToken.error })
    }

    const now = Date.now()

    const newCredentialsResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${process.env.SUPABASE_OAUTH_CLIENT_ID}:${process.env.SUPABASE_OAUTH_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: params.credentials.refreshToken,
      }),
    })

    if (!newCredentialsResponse.ok) {
      throw new Error('Failed to fetch new credentials', {
        cause: {
          status: newCredentialsResponse.status,
          statusText: newCredentialsResponse.statusText,
        },
      })
    }

    const newCredentials = (await newCredentialsResponse.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const expiresAt = new Date(now + newCredentials.expires_in * 1000)

    const updateRefreshToken = await supabaseAdmin.rpc('update_secret', {
      secret_id: params.credentials.refreshToken,
      new_secret: newCredentials.refresh_token,
    })

    if (updateRefreshToken.error) {
      throw new Error('Failed to update refresh token', { cause: updateRefreshToken.error })
    }

    const updateAccessToken = await supabaseAdmin.rpc('update_secret', {
      secret_id: params.credentials.accessToken,
      new_secret: newCredentials.access_token,
    })

    if (updateAccessToken.error) {
      throw new Error('Failed to update access token', { cause: updateAccessToken.error })
    }

    const updateIntegration = await ctx.supabase
      .from('deployment_provider_integrations')
      .update({
        credentials: {
          accessToken: params.credentials.accessToken,
          expiresAt: expiresAt.toISOString(),
          refreshToken: params.credentials.refreshToken,
        },
      })
      .eq('id', params.integrationId)

    if (updateIntegration.error) {
      throw new Error('Failed to update integration', { cause: updateIntegration.error })
    }
  }

  const accessToken = await supabaseAdmin.rpc('read_secret', {
    secret_id: params.credentials.accessToken,
  })

  if (accessToken.error) {
    throw new Error('Failed to read access token', { cause: accessToken.error })
  }

  return accessToken.data
}

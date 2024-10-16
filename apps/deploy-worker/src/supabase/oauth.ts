import { supabaseAdmin } from './client.ts'

type Credentials = { expiresAt: string; refreshToken: string; accessToken: string }

export async function getAccessToken(
  integrationId: number,
  credentials: Credentials
): Promise<string> {
  // the expiresAt expires in less than 1 hour, refresh the token
  if (new Date(credentials.expiresAt) < new Date(Date.now() + 1 * 60 * 60 * 1000)) {
    const refreshToken = await supabaseAdmin.rpc('read_secret', {
      secret_id: credentials.refreshToken,
    })

    if (refreshToken.error) {
      console.error(refreshToken.error)
      throw new Error('Failed to read refresh token')
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
        refresh_token: credentials.refreshToken,
      }),
    })

    if (!newCredentialsResponse.ok) {
      console.error(newCredentialsResponse)
      throw new Error('Failed to fetch new credentials')
    }

    const newCredentials = (await newCredentialsResponse.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const expiresAt = new Date(now + newCredentials.expires_in * 1000)

    await supabaseAdmin.rpc('update_secret', {
      secret_id: credentials.refreshToken,
      new_secret: newCredentials.refresh_token,
    })
    await supabaseAdmin.rpc('update_secret', {
      secret_id: credentials.accessToken,
      new_secret: newCredentials.access_token,
    })
    await supabaseAdmin
      .from('deployment_provider_integrations')
      .update({
        credentials: {
          accessToken: credentials.accessToken,
          expiresAt: expiresAt.toISOString(),
          refreshToken: credentials.refreshToken,
        },
      })
      .eq('id', integrationId)
  }

  const accessToken = await supabaseAdmin.rpc('read_secret', {
    secret_id: credentials.accessToken,
  })

  if (accessToken.error) {
    console.error(accessToken.error)
    throw new Error('Failed to read access token')
  }

  return accessToken.data
}

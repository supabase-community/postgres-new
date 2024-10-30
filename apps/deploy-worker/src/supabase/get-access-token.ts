import { DeployError, IntegrationRevokedError } from '../error.ts'
import { supabaseAdmin } from './client.ts'
import type { Credentials } from './types.ts'

/**
 * Get the access token for a given Supabase integration.
 */
export async function getAccessToken(params: {
  integrationId: number
  credentialsSecretId: string
}): Promise<string> {
  const credentialsSecret = await supabaseAdmin.rpc('read_secret', {
    secret_id: params.credentialsSecretId,
  })

  if (credentialsSecret.error) {
    throw new DeployError('Failed to read credentials secret', { cause: credentialsSecret.error })
  }

  const credentials = JSON.parse(credentialsSecret.data) as Credentials

  let accessToken = credentials.accessToken

  // if the token expires in less than 1 hour, refresh it
  if (new Date(credentials.expiresAt) < new Date(Date.now() + 1 * 60 * 60 * 1000)) {
    const now = Date.now()

    const newCredentialsResponse = await fetch(
      `${process.env.SUPABASE_PLATFORM_API_URL}/v1/oauth/token`,
      {
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
      }
    )

    if (!newCredentialsResponse.ok) {
      if (newCredentialsResponse.status === 406) {
        throw new IntegrationRevokedError()
      }

      throw new DeployError('Failed to fetch new credentials', {
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

    accessToken = newCredentials.access_token

    const expiresAt = new Date(now + newCredentials.expires_in * 1000)

    const updateCredentialsSecret = await supabaseAdmin.rpc('update_secret', {
      secret_id: params.credentialsSecretId,
      new_secret: JSON.stringify({
        accessToken: newCredentials.access_token,
        expiresAt: expiresAt.toISOString(),
        refreshToken: newCredentials.refresh_token,
      }),
    })

    if (updateCredentialsSecret.error) {
      throw new DeployError('Failed to update credentials secret', {
        cause: updateCredentialsSecret.error,
      })
    }
  }

  return accessToken
}

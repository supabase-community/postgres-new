import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './types.js'
import { IntegrationRevokedError } from '../../error.js'

const integrationRevokedMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.status === 406) {
      throw new IntegrationRevokedError()
    }
  },
}

export function createManagementApiClient(accessToken: string) {
  const client = createClient<paths>({
    baseUrl: process.env.SUPABASE_PLATFORM_API_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  client.use(integrationRevokedMiddleware)

  return client
}

import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './types.ts'
import { IntegrationRevokedError } from '../../error.ts'

const integrationRevokedMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.status === 406) {
      throw new IntegrationRevokedError()
    }
  },
}

export function createManagementApiClient(accessToken: string) {
  const client = createClient<paths>({
    baseUrl: 'https://api.supabase.com/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  client.use(integrationRevokedMiddleware)

  return client
}

import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './types.js'
import { IntegrationRevokedError } from '../../error.js'
import type { SupabasePlatformConfig } from '../types.js'

const integrationRevokedMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.status === 406) {
      throw new IntegrationRevokedError()
    }
  },
}

export function createManagementApiClient(
  ctx: { supabasePlatformConfig: SupabasePlatformConfig },
  accessToken: string
) {
  const client = createClient<paths>({
    baseUrl: ctx.supabasePlatformConfig.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  client.use(integrationRevokedMiddleware)

  return client
}

import createClient from 'openapi-fetch'
import type { paths } from './types.ts'

export const createManagementApiClient = (accessToken: string) =>
  createClient<paths>({
    baseUrl: 'https://api.supabase.com/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

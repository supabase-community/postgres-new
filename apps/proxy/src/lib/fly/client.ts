import createClient from 'openapi-fetch'
import type { paths } from './types.ts'
import { env } from '../../env.ts'

export const fly = createClient<paths>({
  baseUrl: 'http://_api.internal:4280/v1',
  headers: {
    Authorization: `Bearer ${env.FLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
})

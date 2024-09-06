import process from 'node:process'
import { z } from 'zod'

export const env = z
  .object({
    AWS_S3_BUCKET: z.string(),
    AWS_ENDPOINT_URL_S3: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_URL: z.string(),
    WILDCARD_DOMAIN: z.string(),
  })
  .parse(process.env)

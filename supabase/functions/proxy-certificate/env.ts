import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

export const env = z
  .object({
    ACME_DOMAIN: z.string(),
    ACME_EMAIL: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_ENDPOINT_URL_S3: z.string(),
    AWS_S3_BUCKET: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    CLOUDFLARE_API_TOKEN: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_URL: z.string(),
  })
  .parse(Deno.env.toObject())

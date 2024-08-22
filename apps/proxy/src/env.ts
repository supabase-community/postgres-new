import { z } from 'zod'

export const env = z
  .object({
    S3FS_MOUNT: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_URL: z.string(),
    WEBSOCKET_PORT: z.string().transform((s) => parseInt(s)),
    WILDCARD_DOMAIN: z.string(),
  })
  .parse(process.env)

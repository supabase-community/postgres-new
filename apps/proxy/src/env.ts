import { z } from 'zod'

export const env = z
  .object({
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_ENDPOINT_URL_S3: z.string(),
    AWS_S3_BUCKET: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    CACHE_DISK_USAGE_THRESHOLD: z.string().transform((val) => parseInt(val, 10)),
    CACHE_PATH: z.string(),
    CACHE_SCHEDULE_INTERVAL: z.string().transform((val) => parseInt(val, 10)),
    CACHE_TIMESTAMP_FILE: z.string(),
    CACHE_TTL: z.string().transform((val) => parseInt(val, 10)),
    S3FS_MOUNT: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_URL: z.string(),
    WILDCARD_DOMAIN: z.string(),
  })
  .parse(process.env)

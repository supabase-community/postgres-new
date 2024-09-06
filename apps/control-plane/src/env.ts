import process from 'node:process'
import { z } from 'zod'

export const env = z
  .object({
    FLY_API_TOKEN: z.string(),
    FLY_REGION: z.string(),
    WORKER_APP_NAME: z.string(),
  })
  .parse(process.env)

import { findUp } from 'find-up'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const _env = z
  .object({
    FLY_API_TOKEN: z.string().optional(),
    FLY_APP_NAME: z.string().optional(),
    FLY_MACHINE_ID: z.string().optional(),
    S3FS_MOUNT: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_URL: z.string(),
    WILDCARD_DOMAIN: z.string(),
  })
  .parse(process.env)

export const env = {
  ..._env,
  PGLITE_VERSION: await getPgliteVersion(),
}

async function getPgliteVersion() {
  const packageLockJsonPath = await findUp('package-lock.json')

  if (!packageLockJsonPath) {
    throw new Error('package-lock.json not found')
  }

  const packageLockJson = JSON.parse(await readFile(packageLockJsonPath, 'utf8')) as {
    packages: {
      'node_modules/@electric-sql/pglite': {
        version: string
      }
    }
  }

  return `(PGlite ${packageLockJson.packages['node_modules/@electric-sql/pglite'].version})`
}

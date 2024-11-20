import { DeployError, IntegrationRevokedError } from '@database.build/deploy'
import {
  type Database,
  type Region,
  type SupabaseDeploymentConfig,
  type SupabasePlatformConfig,
} from '@database.build/deploy/supabase'
import { revokeIntegration } from '@database.build/deploy/supabase'
import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { createClient } from '@supabase/supabase-js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { deploy } from './deploy.ts'

const supabasePlatformConfig: SupabasePlatformConfig = {
  url: process.env.SUPABASE_PLATFORM_URL!,
  apiUrl: process.env.SUPABASE_PLATFORM_API_URL!,
  oauthClientId: process.env.SUPABASE_OAUTH_CLIENT_ID!,
  oauthSecret: process.env.SUPABASE_OAUTH_SECRET!,
}

const supabaseDeploymentConfig: SupabaseDeploymentConfig = {
  region: process.env.SUPABASE_PLATFORM_DEPLOY_REGION! as Region,
}

const app = new Hono()

app.use('*', cors())

app.post(
  '/',
  zValidator(
    'json',
    z.object({
      databaseId: z.string(),
      integrationId: z.number().int(),
      databaseUrl: z.string(),
    })
  ),
  async (c) => {
    const { databaseId, integrationId, databaseUrl: localDatabaseUrl } = c.req.valid('json')

    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '')
    const refreshToken = c.req.header('X-Refresh-Token')
    if (!accessToken || !refreshToken) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const supabaseAdmin = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const ctx = {
      supabase,
      supabaseAdmin,
      supabasePlatformConfig,
      supabaseDeploymentConfig,
    }

    try {
      const project = await deploy(ctx, { databaseId, integrationId, localDatabaseUrl })
      return c.json({ project })
    } catch (error: unknown) {
      console.error(error)
      if (error instanceof DeployError) {
        throw new HTTPException(500, { message: error.message })
      }
      if (error instanceof IntegrationRevokedError) {
        await revokeIntegration(ctx, { integrationId })
        throw new HTTPException(406, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Internal server error' })
    }
  }
)

app.get('')

const port = 4000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})

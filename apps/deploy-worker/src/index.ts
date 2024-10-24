import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createClient } from './supabase/client.ts'
import { HTTPException } from 'hono/http-exception'
import { deploy } from './supabase/deploy.ts'
import { DeployError } from './error.ts'

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

    const supabase = createClient()

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    try {
      const project = await deploy({ supabase }, { databaseId, integrationId, localDatabaseUrl })
      return c.json({ project })
    } catch (error: unknown) {
      console.error(error)
      if (error instanceof DeployError) {
        throw new HTTPException(500, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Internal server error' })
    }
  }
)

const port = 4000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})

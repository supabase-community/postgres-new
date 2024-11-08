import { SupabaseClient as SupabaseClientGeneric } from '@supabase/supabase-js'
import type { Database as SupabaseDatabase } from './database-types.js'
import type { createManagementApiClient } from './management-api/client.js'
import type { paths } from './management-api/types.js'

export type Credentials = { expiresAt: string; refreshToken: string; accessToken: string }

export type Project =
  paths['/v1/projects/{ref}']['get']['responses']['200']['content']['application/json']

type Unpacked<T> = T extends (infer U)[] ? U : T

type Database = Unpacked<
  paths['/v1/projects/{ref}/config/database/pooler']['get']['responses']['200']['content']['application/json']
>

export type Region =
  paths['/v1/projects']['post']['requestBody']['content']['application/json']['region']

export type SupabaseProviderMetadata = {
  project: {
    id: Project['id']
    organizationId: Project['organization_id']
    name: Project['name']
    region: Project['region']
    createdAt: Project['created_at']
    database: {
      host: NonNullable<Project['database']>['host']
      name: string
      port: number
      user: string
    }
    pooler: {
      host: Database['db_host']
      name: Database['db_name']
      port: number
      user: Database['db_user']
    }
  }
}

export type SupabaseClient = SupabaseClientGeneric<SupabaseDatabase>

export type ManagementApiClient = Awaited<ReturnType<typeof createManagementApiClient>>

export type SupabasePlatformConfig = {
  url: string
  apiUrl: string
  oauthClientId: string
  oauthSecret: string
}

export type SupabaseDeploymentConfig = {
  region: Region
}

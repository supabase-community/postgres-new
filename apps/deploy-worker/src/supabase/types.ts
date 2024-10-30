import type { createClient } from './client.ts'
import type { createManagementApiClient } from './management-api/client.ts'
import type { paths } from './management-api/types.ts'

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

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type ManagementApiClient = Awaited<ReturnType<typeof createManagementApiClient>>

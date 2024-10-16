type ProjectStatus =
  | 'ACTIVE_HEALTHY'
  | 'ACTIVE_UNHEALTHY'
  | 'COMING_UP'
  | 'GOING_DOWN'
  | 'INACTIVE'
  | 'INIT_FAILED'
  | 'REMOVED'
  | 'RESTARTING'
  | 'UNKNOWN'
  | 'UPGRADING'
  | 'PAUSING'
  | 'RESTORING'
  | 'RESTORE_FAILED'
  | 'PAUSE_FAILED'

export type Project = {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  database: {
    host: string
    version: string
    postgres_engine: string
    release_channel: string
  }
  status: ProjectStatus
}

export type SupabaseProviderMetadata = {
  project: Project & {
    database: Project['database'] & {
      password: string
    }
  }
}

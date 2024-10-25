import { DeployError } from '../error.ts'
import type { ManagementApiClient, Project } from './types.ts'
import { setTimeout } from 'timers/promises'

/**
 * Wait for a Supabase project to be ready.
 */
export async function waitForProjectToBeHealthy(
  ctx: { managementApiClient: ManagementApiClient },
  params: { project: Project }
) {
  const MAX_POLLING_TIME = 2 // 2 minutes
  const POLLING_INTERVAL = 5 * 1000 // 5 seconds in milliseconds
  const MAX_ATTEMPTS = (MAX_POLLING_TIME * 60 * 1000) / POLLING_INTERVAL

  let attempts = 0

  while (attempts < MAX_ATTEMPTS) {
    try {
      const { data: project, error } = await ctx.managementApiClient.GET('/v1/projects/{ref}', {
        params: {
          path: {
            ref: params.project.id,
          },
        },
      })

      if (error) {
        throw new DeployError('Failed to get Supabase project health status', {
          cause: error,
        })
      }

      if (project.status === 'ACTIVE_HEALTHY') {
        return
      }

      attempts += 1
      await setTimeout(POLLING_INTERVAL)
    } catch (error) {
      throw error
    }
  }

  throw new DeployError(`Project did not become healthy within ${MAX_POLLING_TIME} minutes`)
}

/**
 * Wait for a Supabase project's database to be ready.
 */
export async function waitForDatabaseToBeHealthy(
  ctx: { managementApiClient: ManagementApiClient },
  params: { project: Project }
) {
  const MAX_POLLING_TIME = 2 // 2 minutes
  const POLLING_INTERVAL = 5 * 1000 // 5 seconds in milliseconds
  const MAX_ATTEMPTS = (MAX_POLLING_TIME * 60 * 1000) / POLLING_INTERVAL

  let attempts = 0

  while (attempts < MAX_ATTEMPTS) {
    try {
      const { data: servicesHealth, error } = await ctx.managementApiClient.GET(
        '/v1/projects/{ref}/health',
        {
          params: {
            path: {
              ref: params.project.id,
            },
            query: {
              services: ['db', 'pooler'],
            },
          },
        }
      )

      if (error) {
        throw new DeployError("Failed to get Supabase project's database health status", {
          cause: error,
        })
      }

      const databaseService = servicesHealth.find((service) => service.name === 'db')
      const poolerService = servicesHealth.find((service) => service.name === 'pooler')

      if (!databaseService) {
        throw new DeployError('Database service not found on Supabase for health check')
      }

      if (!poolerService) {
        throw new DeployError('Pooler service not found on Supabase for health check')
      }

      if (
        databaseService.status === 'ACTIVE_HEALTHY' &&
        poolerService.status === 'ACTIVE_HEALTHY'
      ) {
        return
      }

      attempts += 1
      await setTimeout(POLLING_INTERVAL)
    } catch (error) {
      throw error
    }
  }

  throw new DeployError(`Database did not become healthy within ${MAX_POLLING_TIME} minutes`)
}

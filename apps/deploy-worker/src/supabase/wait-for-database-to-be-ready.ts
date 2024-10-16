import type { Project } from './types.ts'
import { setTimeout } from 'timers/promises'

const MAX_POLLING_TIME = 3 * 60 * 1000 // 3 minutes in milliseconds
const POLLING_INTERVAL = 10 * 1000 // 10 seconds in milliseconds

type DatabaseStatus = 'COMING_UP' | 'ACTIVE_HEALTHY' | 'UNHEALTHY'

export async function waitForDatabaseToBeReady(project: Project, accessToken: string) {
  const params = new URLSearchParams({ services: ['db'] }).toString()

  const startTime = Date.now()

  while (true) {
    try {
      const servicesHealthResponse = await fetch(
        `https://api.supabase.com/v1/projects/${project.id}/health?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!servicesHealthResponse.ok) {
        throw new Error("Failed to get Supabase project's database health status")
      }

      const servicesHealth = (await servicesHealthResponse.json()) as {
        name: 'db'
        status: DatabaseStatus
        error: string
      }[]

      const databaseService = servicesHealth.find((service) => service.name === 'db')

      if (!databaseService) {
        throw new Error('Database service not found on Supabase for health check')
      }

      if (databaseService.status === 'UNHEALTHY') {
        throw new Error('Database is unhealthy on Supabase', {
          cause: databaseService.error,
        })
      }

      if (databaseService.status === 'ACTIVE_HEALTHY') {
        return
      }

      if (Date.now() - startTime > MAX_POLLING_TIME) {
        throw new Error('Polling timeout: Database did not become active within 2 minutes')
      }

      await setTimeout(POLLING_INTERVAL)
    } catch (error) {
      throw error
    }
  }
}

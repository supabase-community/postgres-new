import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { getDeployedDatabasesQueryKey } from './deployed-databases-query'
import { useApp } from '~/components/app-provider'
import type { DatabaseUploadResponse } from '~/app/api/databases/[id]/upload/route'

export type DeployedDatabaseCreateVariables = {
  databaseId: string
  name: string | null
  createdAt: Date
}

export type DeployedDatabaseCreateResult = Extract<
  DatabaseUploadResponse,
  { success: true }
>['data']

export const useDeployedDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<DeployedDatabaseCreateResult, Error, DeployedDatabaseCreateVariables>,
  'mutationFn'
> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<DeployedDatabaseCreateResult, Error, DeployedDatabaseCreateVariables>({
    mutationFn: async (variables) => {
      if (!dbManager) {
        throw new Error('No dbManager')
      }

      const db = await dbManager.getDbInstance(variables.databaseId)
      const dump = await db.dumpDataDir()

      const formData = new FormData()
      formData.append('dump', dump, 'dump.tar')
      formData.append('name', variables.name ?? 'My database')
      formData.append('created_at', variables.createdAt.toISOString())

      const response = await fetch(`/api/databases/${variables.databaseId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as DatabaseUploadResponse

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    },
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDeployedDatabasesQueryKey() }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

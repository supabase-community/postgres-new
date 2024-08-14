import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { getDeployedDatabasesQueryKey } from './deployed-databases-query'
import type { DatabaseDeleteResponse } from '~/app/api/databases/[id]/route'

export type DeployedDatabaseDeleteVariables = {
  databaseId: string
}

export const useDeployedDatabaseDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error, DeployedDatabaseDeleteVariables>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeployedDatabaseDeleteVariables>({
    mutationFn: async (variables) => {
      const response = await fetch(`/api/databases/${variables.databaseId}`, {
        method: 'DELETE',
      })

      const result = (await response.json()) as DatabaseDeleteResponse

      if (!result.success) {
        throw new Error(result.error)
      }
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

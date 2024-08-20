import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { getDeployedDatabasesQueryKey } from './deployed-databases-query'
import { DatabaseResetPasswordResponse } from '~/app/api/databases/[id]/reset-password/route'

export type DeployedDatabaseResetPasswordVariables = {
  databaseId: string
}

export type DeployedDatabaseResetPasswordResult = Extract<
  DatabaseResetPasswordResponse,
  { success: true }
>['data']

export const useDeployedDatabaseResetPasswordMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<
    DeployedDatabaseResetPasswordResult,
    Error,
    DeployedDatabaseResetPasswordVariables
  >,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<
    DeployedDatabaseResetPasswordResult,
    Error,
    DeployedDatabaseResetPasswordVariables
  >({
    mutationFn: async (variables) => {
      const response = await fetch(`/api/databases/${variables.databaseId}/reset-password`, {
        method: 'POST',
      })

      const result = (await response.json()) as DatabaseResetPasswordResponse

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

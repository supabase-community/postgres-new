import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { getDatabaseQueryKey } from './database-query'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseDeleteVariables = {
  id: string
}

export const useDatabaseDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error, DatabaseDeleteVariables>, 'mutationFn'> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<void, Error, DatabaseDeleteVariables>({
    mutationFn: async ({ id }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.deleteDatabase(id)
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getDatabasesQueryKey() })])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDatabaseQueryKey(variables.id) }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

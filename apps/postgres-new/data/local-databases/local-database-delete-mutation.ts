import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { getLocalDatabaseQueryKey } from './local-database-query'
import { getLocalDatabasesQueryKey } from './local-databases-query'

export type LocalDatabaseDeleteVariables = {
  id: string
}

export const useLocalDatabaseDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error, LocalDatabaseDeleteVariables>, 'mutationFn'> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<void, Error, LocalDatabaseDeleteVariables>({
    mutationFn: async ({ id }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.deleteDatabase(id)
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getLocalDatabasesQueryKey() })])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getLocalDatabaseQueryKey(variables.id) }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

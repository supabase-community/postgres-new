import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'
import { getLocalDatabaseQueryKey } from './local-database-query'
import { getLocalDatabasesQueryKey } from './local-databases-query'

export type LocalDatabaseUpdateVariables = {
  id: string
  name: string | null
  isHidden: boolean
}

export const useLocalDatabaseUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<Database, Error, LocalDatabaseUpdateVariables>, 'mutationFn'> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<Database, Error, LocalDatabaseUpdateVariables>({
    mutationFn: async ({ id, name, isHidden }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.updateDatabase(id, { name, isHidden })
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

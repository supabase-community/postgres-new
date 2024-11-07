import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'
import { getDatabaseQueryKey } from './database-query'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseUpdateVariables = {
  id: string
  name: string | null
  isHidden: boolean
}

export const useDatabaseUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<Database, Error, DatabaseUpdateVariables>, 'mutationFn'> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<Database, Error, DatabaseUpdateVariables>({
    mutationFn: async ({ id, name, isHidden }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.updateDatabase(id, { name, isHidden })
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

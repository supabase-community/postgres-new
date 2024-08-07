import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseCreateVariables = {
  id: string
  isHidden: boolean
}

export const useDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<Database, Error, DatabaseCreateVariables>, 'mutationFn'> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<Database, Error, DatabaseCreateVariables>({
    mutationFn: async ({ id, isHidden }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.createDatabase(id, { isHidden })
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getDatabasesQueryKey() })])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

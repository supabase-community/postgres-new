import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { LocalDatabase } from '~/lib/db'
import { getLocalDatabasesQueryKey } from './local-databases-query'

export type LocalDatabaseCreateVariables = {
  id: string
  isHidden: boolean
}

export const useLocalDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<LocalDatabase, Error, LocalDatabaseCreateVariables>,
  'mutationFn'
> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<LocalDatabase, Error, LocalDatabaseCreateVariables>({
    mutationFn: async ({ id, isHidden }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.createDatabase(id, { isHidden })
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getLocalDatabasesQueryKey() })])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

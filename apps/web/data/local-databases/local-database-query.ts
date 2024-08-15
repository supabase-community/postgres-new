import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { LocalDatabase } from '~/lib/db'

export const useLocalDatabaseQuery = (
  id: string,
  options: Omit<UseQueryOptions<LocalDatabase, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()
  return useQuery<LocalDatabase, Error>({
    ...options,
    queryKey: getLocalDatabaseQueryKey(id),
    queryFn: async () => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.getDatabase(id)
    },
    staleTime: Infinity,
  })
}

export const getLocalDatabaseQueryKey = (id: string) => ['database', id]

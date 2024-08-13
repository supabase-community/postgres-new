import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'

export const useLocalDatabaseQuery = (
  id: string,
  options: Omit<UseQueryOptions<Database, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()
  return useQuery<Database, Error>({
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

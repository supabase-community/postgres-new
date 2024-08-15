import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { LocalDatabase } from '~/lib/db'

export const useLocalDatabasesQuery = (
  options: Omit<UseQueryOptions<LocalDatabase[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()

  return useQuery<LocalDatabase[], Error>({
    ...options,
    queryKey: getLocalDatabasesQueryKey(),
    queryFn: async () => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.getDatabases()
    },
    staleTime: Infinity,
  })
}

export const getLocalDatabasesQueryKey = () => ['databases']

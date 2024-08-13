import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'

export const useLocalDatabasesQuery = (
  options: Omit<UseQueryOptions<Database[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()

  return useQuery<Database[], Error>({
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

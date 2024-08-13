import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { Database } from '~/lib/db'

export const useDatabasesQuery = (
  options: Omit<UseQueryOptions<Database[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()

  return useQuery<Database[], Error>({
    ...options,
    queryKey: getDatabasesQueryKey(),
    queryFn: async () => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.getDatabases()
    },
    staleTime: Infinity,
  })
}

export const getDatabasesQueryKey = () => ['databases']

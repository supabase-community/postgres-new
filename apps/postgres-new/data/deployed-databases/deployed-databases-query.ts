import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { Database } from '~/utils/supabase/db-types'
import { createClient } from '~/utils/supabase/client'

type DeployedDatabase = Database['public']['Tables']['deployed_databases']['Row']

export const useDeployedDatabasesQuery = (
  options: Omit<UseQueryOptions<DeployedDatabase[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery<DeployedDatabase[], Error>({
    ...options,
    queryKey: getDeployedDatabasesQueryKey(),
    queryFn: async () => {
      const supabase = createClient()
      const deployedDatabases = await supabase.from('deployed_databases').select()
      return deployedDatabases.data ?? []
    },
  })
}

export const getDeployedDatabasesQueryKey = () => ['deployed-databases', 'authenticated']

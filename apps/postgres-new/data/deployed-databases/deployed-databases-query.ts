import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { Database } from '~/utils/supabase/db-types'

type DeployedDatabase = Pick<
  Database['public']['Tables']['deployed_databases']['Row'],
  'id' | 'database_id' | 'created_at' | 'name' | 'deployed_at'
>

export const useDeployedDatabasesQuery = (
  options: Omit<UseQueryOptions<DeployedDatabase[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const supabase = createClient()

  return useQuery<DeployedDatabase[], Error>({
    ...options,
    queryKey: getDeployedDatabasesQueryKey(),
    queryFn: async () => {
      const { error } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      const { data: deployedDatabases, error: deployedDatabasesError } = await supabase
        .from('deployed_databases')
        .select('id, database_id, name, created_at, deployed_at')

      return deployedDatabases ?? []
    },
  })
}

export const getDeployedDatabasesQueryKey = () => ['deployed-databases']

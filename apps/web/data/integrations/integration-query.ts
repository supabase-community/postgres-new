import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { Database } from '~/utils/supabase/db-types'
import { createClient } from '~/utils/supabase/client'

export type Integration = {
  id: number
  deployment_providers: {
    name: string
  }
}

export const useIntegrationQuery = (
  name: string,
  options: Omit<UseQueryOptions<Integration, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery<Integration, Error>({
    ...options,
    queryKey: getIntegrationQueryKey(name),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('deployment_provider_integrations')
        .select('id, deployment_providers!inner(name)')
        .eq('deployment_providers.name', name)
        .is('revoked_at', null)
        .single()

      if (error) {
        throw error
      }

      return data
    },
  })
}

export const getIntegrationQueryKey = (name: string) => ['integration', name]

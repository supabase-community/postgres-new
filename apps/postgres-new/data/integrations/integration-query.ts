import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { IntegrationDetails } from '~/app/api/integrations/[id]/details/route'
import { createClient } from '~/utils/supabase/client'

async function getIntegrationDetails(id: number): Promise<IntegrationDetails> {
  const response = await fetch(`/api/integrations/${id}/details`)

  if (!response.ok) {
    throw new Error('Failed to fetch integration details')
  }

  return await response.json()
}

async function getIntegration(name: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deployment_provider_integrations')
    .select('id, deployment_providers!inner()')
    .eq('deployment_providers.name', name)
    .is('revoked_at', null)
    .single()

  if (error) {
    throw error
  }

  return data
}

export const useIntegrationQuery = (
  name: string,
  options: Omit<UseQueryOptions<IntegrationDetails, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery<IntegrationDetails, Error>({
    ...options,
    queryKey: getIntegrationQueryKey(name),
    queryFn: async () => {
      const { id } = await getIntegration(name)
      return await getIntegrationDetails(id)
    },
    retry: false,
  })
}

export const getIntegrationQueryKey = (name: string) => ['integration', name]

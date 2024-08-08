import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { getIsOnDeployWaitlistQueryKey } from './deploy-waitlist-query'

export const useDeployWaitlistCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error>({
    mutationFn: async () => {
      const supabase = createClient()

      const { error } = await supabase.from('deploy_waitlist').insert({})

      if (error) {
        throw error
      }
    },
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getIsOnDeployWaitlistQueryKey() }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

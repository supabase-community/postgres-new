import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { getIsOnPublishWaitlistQueryKey } from './publish-waitlist-query'

export const usePublishWaitlistCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error>({
    mutationFn: async () => {
      const supabase = createClient()

      const { error } = await supabase.from('publish_waitlist').insert({})

      if (error) {
        throw error
      }
    },
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getIsOnPublishWaitlistQueryKey() }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

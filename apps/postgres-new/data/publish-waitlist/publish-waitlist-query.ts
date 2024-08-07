import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'

export const useIsOnPublishWaitlistQuery = (
  options: Omit<UseQueryOptions<boolean, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const supabase = createClient()

  return useQuery<boolean, Error>({
    ...options,
    queryKey: getIsOnPublishWaitlistQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      const { user } = data

      const { data: waitlistRecord, error: waitlistError } = await supabase
        .from('publish_waitlist')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log({ waitlistRecord })

      if (waitlistError) {
        throw waitlistError
      }

      return waitlistRecord !== null
    },
  })
}

export const getIsOnPublishWaitlistQueryKey = () => ['publish-waitlist']

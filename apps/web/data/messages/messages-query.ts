import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { Message } from 'ai'
import { useApp } from '~/components/app-provider'

export const useMessagesQuery = (
  databaseId: string,
  options: Omit<UseQueryOptions<Message[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()

  return useQuery<Message[], Error>({
    ...options,
    queryKey: getMessagesQueryKey(databaseId),
    queryFn: async () => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.getMessages(databaseId)
    },
    staleTime: Infinity,
  })
}

export const getMessagesQueryKey = (databaseId: string) => ['messages', { databaseId }]

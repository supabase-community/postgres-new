import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { Message } from 'ai'
import { useApp } from '~/components/app-provider'
import { getMessagesQueryKey } from './messages-query'

export type MessageCreateVariables = {
  message: Message
}

export const useMessageCreateMutation = (
  databaseId: string,
  {
    onSuccess,
    onError,
    ...options
  }: Omit<UseMutationOptions<void, Error, MessageCreateVariables>, 'mutationFn'> = {}
) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<void, Error, MessageCreateVariables>({
    mutationFn: async ({ message }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      return await dbManager.createMessage(databaseId, message)
    },
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(databaseId) }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

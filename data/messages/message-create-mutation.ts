import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { Message } from 'ai'
import { getMetaDb } from '~/lib/db'
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
  const queryClient = useQueryClient()

  return useMutation<void, Error, MessageCreateVariables>({
    mutationFn: async ({ message }) => {
      const metaDb = await getMetaDb()

      if (message.toolInvocations) {
        await metaDb.query(
          'insert into messages (id, database_id, role, content, tool_invocations) values ($1, $2, $3, $4, $5)',
          [
            message.id,
            databaseId,
            message.role,
            message.content,
            JSON.stringify(message.toolInvocations),
          ]
        )
      } else {
        await metaDb.query(
          'insert into messages (id, database_id, role, content) values ($1, $2, $3, $4)',
          [message.id, databaseId, message.role, message.content]
        )
      }
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

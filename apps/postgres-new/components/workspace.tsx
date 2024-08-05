'use client'

import { CreateMessage, Message, useChat } from 'ai/react'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useMessageCreateMutation } from '~/data/messages/message-create-mutation'
import { useMessagesQuery } from '~/data/messages/messages-query'
import { useTablesQuery } from '~/data/tables/tables-query'
import { useOnToolCall } from '~/lib/hooks'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { ensureMessageId } from '~/lib/util'
import { useApp } from './app-provider'
import Chat, { getInitialMessages } from './chat'
import IDE from './ide'

// TODO: support public/private DBs that live in the cloud
export type Visibility = 'local'

export type WorkspaceProps = {
  /**
   * The unique ID for this database.
   */
  databaseId: string

  /**
   * The visibility of this database/conversation.
   */
  visibility: Visibility

  /**
   * Callback called when the conversation has started.
   */
  onStart?: () => void | Promise<void>
}

export default function Workspace({ databaseId, visibility, onStart }: WorkspaceProps) {
  const { dbManager } = useApp()
  const isSmallBreakpoint = useBreakpoint('lg')
  const onToolCall = useOnToolCall(databaseId)
  const { mutateAsync: saveMessage } = useMessageCreateMutation(databaseId)

  const { data: tables, isLoading: isLoadingSchema } = useTablesQuery({
    databaseId,
    schemas: ['public', 'meta'],
  })
  const { data: existingMessages, isLoading: isLoadingMessages } = useMessagesQuery(databaseId)

  const initialMessages = useMemo(() => (tables ? getInitialMessages(tables) : undefined), [tables])

  const {
    messages,
    append,
    stop: stopReply,
  } = useChat({
    id: databaseId,
    api: '/api/chat',
    maxToolRoundtrips: 10,
    onToolCall: onToolCall as any, // our `OnToolCall` type is more specific than `ai` SDK's
    initialMessages:
      existingMessages && existingMessages.length > 0 ? existingMessages : initialMessages,
    async onFinish(message) {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      await saveMessage({ message })

      const database = await dbManager.getDatabase(databaseId)
      const isStartOfConversation = database.isHidden && !message.toolInvocations

      if (isStartOfConversation) {
        await onStart?.()

        // Intentionally using `append` vs `appendMessage` so that this message isn't persisted in the meta DB
        await append({
          role: 'user',
          content: 'Name this conversation. No need to reply.',
          data: {
            automated: true,
          },
        })
      }
    },
  })

  const appendMessage = useCallback(
    async (message: Message | CreateMessage) => {
      ensureMessageId(message)
      append(message)
      saveMessage({ message })
    },
    [saveMessage, append]
  )

  const isConversationStarted =
    initialMessages !== undefined && messages.length > initialMessages.length

  return (
    <WorkspaceContext.Provider
      value={{
        databaseId,
        isLoadingMessages,
        isLoadingSchema,
        isConversationStarted,
        messages,
        appendMessage,
        stopReply,
        visibility,
      }}
    >
      <div className="w-full h-full flex flex-col lg:flex-row gap-8">
        <IDE className="flex-1 h-full p-3 sm:py-6 sm:pl-6">
          <Chat />
        </IDE>
        {!isSmallBreakpoint && (
          <div className="flex-1 h-full overflow-x-auto pb-6 pr-6">
            <Chat />
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  )
}

export type WorkspaceContextValues = {
  databaseId: string
  isLoadingMessages: boolean
  isLoadingSchema: boolean
  isConversationStarted: boolean
  messages: Message[]
  visibility: Visibility
  appendMessage(message: Message | CreateMessage): Promise<void>
  stopReply(): void
}

export const WorkspaceContext = createContext<WorkspaceContextValues | undefined>(undefined)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error(
      'WorkspaceContext missing. Are you accessing useWorkspace() outside of a Workspace?'
    )
  }

  return context
}

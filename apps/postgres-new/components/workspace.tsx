'use client'

import { CreateMessage, Message, useChat, UseChatHelpers } from 'ai/react'
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useMessageCreateMutation } from '~/data/messages/message-create-mutation'
import { useMessagesQuery } from '~/data/messages/messages-query'
import { useTablesQuery } from '~/data/tables/tables-query'
import { useOnToolCall } from '~/lib/hooks'
import { TabValue } from '~/lib/schema'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { ensureMessageId, ensureToolResult } from '~/lib/util'
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
   * Callback called after the user sends a message.
   */
  onMessage?: (
    message: Message | CreateMessage,
    append: UseChatHelpers['append']
  ) => void | Promise<void>

  /**
   * Callback called after the LLM finishes a reply.
   */
  onReply?: (message: Message, append: UseChatHelpers['append']) => void | Promise<void>

  /**
   * Callback called when the user cancels the reply.
   */
  onCancelReply?: (append: UseChatHelpers['append']) => void | Promise<void>
}

export default function Workspace({
  databaseId,
  visibility,
  onMessage,
  onReply,
  onCancelReply,
}: WorkspaceProps) {
  const { setIsRateLimited } = useApp()
  const isSmallBreakpoint = useBreakpoint('lg')
  const onToolCall = useOnToolCall(databaseId)
  const { mutateAsync: saveMessage } = useMessageCreateMutation(databaseId)

  const { data: tables, isLoading: isLoadingSchema } = useTablesQuery({
    databaseId,
    schemas: ['public', 'meta'],
  })
  const { data: existingMessages, isLoading: isLoadingMessages } = useMessagesQuery(databaseId)

  const initialMessages = useMemo(() => (tables ? getInitialMessages(tables) : undefined), [tables])

  const { messages, setMessages, append, stop } = useChat({
    id: databaseId,
    api: '/api/chat',
    maxToolRoundtrips: 10,
    keepLastMessageOnError: true,
    onToolCall: onToolCall as any, // our `OnToolCall` type is more specific than `ai` SDK's
    body: {
      databaseId,
    },
    initialMessages:
      existingMessages && existingMessages.length > 0 ? existingMessages : initialMessages,
    async onFinish(message) {
      // Order is important here
      await onReply?.(message, append)
      await saveMessage({ message })
    },
    async onResponse(response) {
      setIsRateLimited(response.status === 429)
    },
  })

  const appendMessage = useCallback(
    async (message: Message | CreateMessage) => {
      setMessages((messages) => {
        const isModified = ensureToolResult(messages)
        return isModified ? [...messages] : messages
      })
      ensureMessageId(message)

      // Intentionally don't await so that framer animations aren't affected
      append(message)
      saveMessage({ message })
      onMessage?.(message, append)
    },
    [onMessage, setMessages, saveMessage, append]
  )

  const stopReply = useCallback(async () => {
    stop()
    onCancelReply?.(append)
  }, [onCancelReply, stop, append])

  const [tab, setTab] = useState<TabValue>('diagram')

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
        tab,
        setTab,
      }}
    >
      <div className="w-full h-full flex flex-col lg:flex-row gap-8">
        <IDE className="flex-1 h-full p-3 pb-3 lg:py-3">
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
  tab: TabValue
  setTab: Dispatch<SetStateAction<TabValue>>
  appendMessage(message: Message | CreateMessage): Promise<void>
  stopReply(): Promise<void>
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

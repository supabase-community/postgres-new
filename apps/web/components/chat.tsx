'use client'

import { Message, generateId } from 'ai'
import { useChat } from 'ai/react'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, ArrowDown, ArrowUp, Flame, Paperclip, PlugIcon, Square } from 'lucide-react'
import {
  FormEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { TablesData } from '~/data/tables/tables-query'
import { saveFile } from '~/lib/files'
import { useAutoScroll, useDropZone } from '~/lib/hooks'
import { requestFileUpload } from '~/lib/util'
import { cn } from '~/lib/utils'
import { AiIconAnimation } from './ai-icon-animation'
import { useApp } from './app-provider'
import ByoLlmButton from './byo-llm-button'
import ChatMessage from './chat-message'
import { CopyableField } from './copyable-field'
import SignInButton from './sign-in-button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useWorkspace } from './workspace'

export function getInitialMessages(tables: TablesData): Message[] {
  return [
    // An artificial tool call containing the DB schema
    // as if it was already called by the LLM
    {
      id: generateId(),
      role: 'assistant',
      content: '',
      toolInvocations: [
        {
          state: 'result',
          toolCallId: generateId(),
          toolName: 'getDatabaseSchema',
          args: {},
          result: tables,
        },
      ],
    },
  ]
}

export default function Chat() {
  const {
    user,
    isLoadingUser,
    focusRef,
    setIsSignInDialogOpen,
    isRateLimited,
    liveShare,
    modelProvider,
    modelProviderError,
    setIsModelProviderDialogOpen,
  } = useApp()
  const [inputFocusState, setInputFocusState] = useState(false)

  const {
    databaseId,
    isLoadingMessages,
    isLoadingSchema,
    isConversationStarted,
    messages,
    appendMessage,
    stopReply,
  } = useWorkspace()

  const { input, setInput, handleInputChange, isLoading } = useChat({
    id: databaseId,
    api: '/api/chat',
  })

  const { ref: scrollRef, isSticky, scrollToEnd } = useAutoScroll()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nextMessageId = useMemo(() => generateId(), [messages.length])

  const sendCsv = useCallback(
    async (file: File) => {
      const fileId = generateId()

      await saveFile(fileId, file)

      const text = await file.text()

      // Add an artificial tool call requesting the CSV
      // with the file result all in one operation.
      appendMessage({
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            state: 'result',
            toolCallId: generateId(),
            toolName: 'requestCsv',
            args: {},
            result: {
              success: true,
              fileId: fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
              },
              preview: text.split('\n').slice(0, 4).join('\n').trim(),
            },
          },
        ],
      })
    },
    [appendMessage]
  )

  const sendSql = useCallback(
    async (file: File) => {
      const fileId = generateId()

      await saveFile(fileId, file)

      const text = await file.text()

      // Add an artificial tool call requesting the CSV
      // with the file result all in one operation.
      appendMessage({
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            state: 'result',
            toolCallId: generateId(),
            toolName: 'requestSql',
            args: {},
            result: {
              success: true,
              fileId: fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
              },
              preview: text.split('\n').slice(0, 10).join('\n').trim(),
            },
          },
        ],
      })
    },
    [appendMessage]
  )

  const {
    ref: dropZoneRef,
    isDraggingOver,
    cursor: dropZoneCursor,
  } = useDropZone({
    async onDrop(files) {
      if (isAuthRequired) {
        return
      }

      const [file] = files

      if (file) {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          await sendCsv(file)
        } else if (file.type === 'application/sql' || file.name.endsWith('.sql')) {
          await sendSql(file)
        } else {
          appendMessage({
            role: 'assistant',
            content: `Only CSV and SQL files are currently supported.`,
          })
        }
      }
    },
    cursorElement: (
      <m.div className="px-5 py-2.5 text-foreground rounded-full bg-border flex gap-2 items-center shadow-xl z-50">
        <Paperclip size={18} /> Add file to chat
      </m.div>
    ),
  })

  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to end when chat is first mounted
  useEffect(() => {
    scrollToEnd()
  }, [scrollToEnd])

  // Focus input when LLM starts responding (for cases when it wasn't focused prior)
  useEffect(() => {
    if (isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  const lastMessage = messages.at(-1)

  const handleFormSubmit: FormEventHandler = useCallback(
    (e) => {
      // Manually manage message submission so that we can control its ID
      // We want to control the ID so that we can perform layout animations via `layoutId`
      // (see hidden dummy message above)
      e.preventDefault()
      appendMessage({
        id: nextMessageId,
        role: 'user',
        content: input,
      })
      setInput('')

      // Scroll to bottom after the message has rendered
      setTimeout(() => {
        scrollToEnd()
      }, 0)
    },
    [appendMessage, nextMessageId, input, setInput, scrollToEnd]
  )

  const [isMessageAnimationComplete, setIsMessageAnimationComplete] = useState(false)

  const isAuthRequired = user === undefined && modelProvider.state?.enabled !== true

  const isChatEnabled =
    !isLoadingMessages && !isLoadingSchema && !isAuthRequired && !liveShare.isLiveSharing

  const isSubmitEnabled = isChatEnabled && Boolean(input.trim())

  // Create imperative handle that can be used to focus the input anywhere in the app
  useImperativeHandle(focusRef, () => ({
    focus() {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    },
  }))

  return (
    <div ref={dropZoneRef} className="h-full flex flex-col items-stretch relative">
      {isDraggingOver && (
        <m.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 0.25 },
          }}
          initial="hidden"
          animate="show"
          className="absolute inset-y-0 -inset-x-2 flex justify-center items-center bg-black rounded-md z-40"
        />
      )}
      {dropZoneCursor}
      <div className="flex-1 relative h-full min-h-0">
        {isLoadingMessages || isLoadingSchema ? (
          <div className="h-full w-full max-w-4xl flex flex-col gap-10 p-5 lg:p-10">
            <Skeleton className="self-end h-10 w-1/3 rounded-3xl" />
            <Skeleton className="self-start h-28 w-2/3 rounded-3xl" />
            <Skeleton className="self-end h-10 w-2/3 rounded-3xl" />
            <Skeleton className="self-start h-56 w-3/4 rounded-3xl" />
            <Skeleton className="self-end h-10 w-1/2 rounded-3xl" />
            <Skeleton className="self-start h-20 w-3/4 rounded-3xl" />
          </div>
        ) : (
          isConversationStarted && (
            <div
              className={cn(
                'h-full flex flex-col items-center overflow-y-auto',
                !isMessageAnimationComplete ? 'overflow-x-hidden' : undefined,
                liveShare.isLiveSharing ? 'overflow-y-hidden' : undefined
              )}
              ref={scrollRef}
            >
              <m.div
                key={databaseId}
                className="flex flex-col gap-8 p-8 w-full max-w-4xl"
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.01,
                    },
                  },
                }}
                onAnimationStart={() => setIsMessageAnimationComplete(false)}
                onAnimationComplete={() => setIsMessageAnimationComplete(true)}
                initial="show"
                animate="show"
              >
                {messages.map((message, i) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                  />
                ))}
                <AnimatePresence initial={false}>
                  {modelProviderError && !isLoading && (
                    <m.div
                      className="flex flex-col gap-4 justify-start items-center max-w-96 p-4 bg-destructive rounded-md text-sm"
                      variants={{
                        hidden: { scale: 0 },
                        show: { scale: 1, transition: { delay: 0.5 } },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <AlertCircle size={64} strokeWidth={1} />
                      <div className="flex flex-col items-center text-start gap-4">
                        <h3 className="font-bold">Whoops!</h3>
                        <p className="text-center">
                          There was an error connecting to your custom model provider:{' '}
                          {modelProviderError}
                        </p>
                        <p>
                          Double check your{' '}
                          <a
                            className="underline cursor-pointer"
                            onClick={() => {
                              setIsModelProviderDialogOpen(true)
                            }}
                          >
                            API info
                          </a>
                          .
                        </p>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {isRateLimited && !isLoading && (
                    <m.div
                      className="flex flex-col gap-4 justify-start items-center max-w-96 p-4 bg-destructive rounded-md text-sm"
                      variants={{
                        hidden: { scale: 0 },
                        show: { scale: 1, transition: { delay: 0.5 } },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <Flame size={64} strokeWidth={1} />
                      <div className="flex flex-col items-center text-start gap-4">
                        <h3 className="font-bold">Hang tight!</h3>
                        <p>
                          We&apos;re seeing a lot of AI traffic from your end and need to
                          temporarily pause your chats to make sure our servers don&apos;t melt.
                        </p>

                        <p>Have a quick coffee break and try again in a few minutes!</p>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {isLoading && (
                    <m.div
                      className="-translate-x-8 flex gap-4 justify-start items-center"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1 },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <m.div>
                        <AiIconAnimation loading />
                      </m.div>
                      {lastMessage &&
                        (lastMessage.role === 'user' ||
                          (lastMessage.role === 'assistant' && !lastMessage.content)) && (
                          <m.div
                            className="text-neutral-400 italic"
                            variants={{
                              hidden: { opacity: 0 },
                              show: { opacity: 1, transition: { delay: 1.5 } },
                            }}
                            initial="hidden"
                            animate="show"
                          >
                            Working on it...
                          </m.div>
                        )}
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            </div>
          )
        )}
        <AnimatePresence>
          {!isSticky && (
            <>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"
              />
              <m.div
                className="absolute bottom-4 left-1/2"
                variants={{
                  hidden: { y: 5, opacity: 0 },
                  show: { y: 0, opacity: 1 },
                }}
                transition={{ duration: 0.1 }}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                <Button
                  className="rounded-full w-8 h-8 p-1.5 text-neutral-50 bg-neutral-900"
                  onClick={() => {
                    scrollToEnd()
                    inputRef.current?.focus()
                  }}
                >
                  <ArrowDown />
                </Button>
              </m.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-3 relative p-8 pt-0">
        <AnimatePresence>
          {!isLoadingUser && (
            <>
              {isAuthRequired ? (
                <m.div
                  className="p-4 border rounded-md bg-background w-full"
                  variants={{
                    hidden: { opacity: 0, y: 100 },
                    show: { opacity: 1, y: 0 },
                  }}
                  animate="show"
                  exit="hidden"
                >
                  <h3 className="font-medium">Sign in to create a database</h3>
                  <p className="text-foreground-muted mb-4">
                    We ask you to sign in to prevent API abuse.
                  </p>
                  <div className="space-y-1">
                    <SignInButton />
                    <ByoLlmButton className="w-full" />
                  </div>
                </m.div>
              ) : (
                !isConversationStarted &&
                !isLoadingMessages &&
                !isLoadingSchema && (
                  <div className="h-full w-full max-w-4xl flex flex-col gap-10 mb-8">
                    <div>
                      <m.h3
                        className="font-medium"
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0 },
                        }}
                        initial="hidden"
                        animate="show"
                      >
                        What would you like to create?
                      </m.h3>
                      <p className="text-muted-foreground">
                        Describe what you want to build and add any specific database requirements.
                      </p>
                      <div className="flex gap-2 flex-wrap mt-4 justify-start">
                        <Button variant="secondary" className="rounded-full">
                          A Slack clone
                        </Button>
                        <Button variant="secondary" className="rounded-full">
                          Document database
                        </Button>
                        <Button variant="secondary" className="rounded-full">
                          Todo list
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </AnimatePresence>
        <form
          className={cn(
            'p-1 rounded-lg bg-muted/50 border w-full max-w-4xl gap-3',
            inputFocusState && 'border-muted-foreground',
            'transition'
          )}
          onSubmit={handleFormSubmit}
        >
          <textarea
            ref={inputRef}
            id="input"
            name="prompt"
            autoComplete="off"
            className="flex-grow border-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/50 bg-transparent resize-none outline-none p-2"
            value={input}
            onChange={handleInputChange}
            placeholder="Message AI or write SQL"
            onFocus={(e) => {
              setInputFocusState(true)
            }}
            onBlur={(e) => {
              setInputFocusState(false)
            }}
            autoFocus
            disabled={!isChatEnabled}
            rows={Math.max(2, Math.min(input.split('\n').length, 10))}
            onKeyDown={(e) => {
              if (!(e.target instanceof HTMLTextAreaElement)) {
                return
              }

              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (!isLoading && isSubmitEnabled) {
                  handleFormSubmit(e)
                }
              }
            }}
          />
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant={'ghost'}
              className="w-8 h-8 text-muted-foreground hover:text-foreground focus:text-foreground rounded-full"
              size="icon"
              onClick={async (e) => {
                e.preventDefault()

                if (isAuthRequired) {
                  return
                }

                const file = await requestFileUpload()
                await sendCsv(file)
              }}
              disabled={!isChatEnabled}
            >
              <Paperclip size={18} strokeWidth={1.3} />
            </Button>
            {isLoading ? (
              <Button
                className="rounded-full w-8 h-8 text-neutral-50 bg-neutral-800"
                type="submit"
                onClick={(e) => {
                  e.preventDefault()
                  stopReply()
                }}
              >
                <Square fill="white" strokeWidth={0} className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <button
                className="rounded-full w-8 h-8 text-neutral-50 bg-neutral-800 disabled:bg-neutral-500 flex justify-center items-center"
                type="submit"
                disabled={!isSubmitEnabled}
              >
                <ArrowUp />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

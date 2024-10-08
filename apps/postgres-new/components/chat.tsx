'use client'

import { Message, generateId } from 'ai'
import { useChat } from 'ai/react'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowDown, ArrowUp, Flame, Paperclip, PlugIcon, Square } from 'lucide-react'
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
  const { user, isLoadingUser, focusRef, setIsSignInDialogOpen, isRateLimited, liveShare } =
    useApp()
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
      if (file.type !== 'text/csv') {
        // Add an artificial tool call requesting the CSV
        // with an error indicating the file wasn't a CSV
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
                success: false,
                error: `The file has type '${file.type}'. Let the user know that only CSV imports are currently supported.`,
              },
            },
          ],
        })
        return
      }

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

  const {
    ref: dropZoneRef,
    isDraggingOver,
    cursor: dropZoneCursor,
  } = useDropZone({
    async onDrop(files) {
      if (!user) {
        return
      }

      const [file] = files

      if (file) {
        await sendCsv(file)
      }
    },
    cursorElement: (
      <m.div
        layoutId={nextMessageId}
        className="px-5 py-2.5 text-foreground rounded-full bg-border flex gap-2 items-center shadow-xl z-50"
      >
        <Paperclip size={14} /> Add file to chat
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

  const isChatEnabled =
    !isLoadingMessages && !isLoadingSchema && user !== undefined && !liveShare.isLiveSharing

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
          <div className="h-full w-full max-w-4xl flex flex-col gap-10 p-10">
            <Skeleton className="self-end h-10 w-1/3 rounded-3xl" />
            <Skeleton className="self-start h-28 w-2/3 rounded-3xl" />
            <Skeleton className="self-end h-10 w-2/3 rounded-3xl" />
            <Skeleton className="self-start h-56 w-3/4 rounded-3xl" />
            <Skeleton className="self-end h-10 w-1/2 rounded-3xl" />
            <Skeleton className="self-start h-20 w-3/4 rounded-3xl" />
          </div>
        ) : isConversationStarted ? (
          <div
            className={cn(
              'h-full flex flex-col items-center overflow-y-auto',
              !isMessageAnimationComplete ? 'overflow-x-hidden' : undefined,
              liveShare.isLiveSharing ? 'overflow-y-hidden' : undefined
            )}
            ref={scrollRef}
          >
            <LiveShareOverlay databaseId={databaseId} />
            <m.div
              key={databaseId}
              className="flex flex-col gap-4 w-full max-w-4xl p-10"
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
                {isRateLimited && !isLoading && (
                  <m.div
                    layout="position"
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
                        We&apos;re seeing a lot of AI traffic from your end and need to temporarily
                        pause your chats to make sure our servers don&apos;t melt.
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
                    <m.div layoutId="ai-loading-icon">
                      <AiIconAnimation loading />
                    </m.div>
                    {lastMessage &&
                      (lastMessage.role === 'user' ||
                        (lastMessage.role === 'assistant' && !lastMessage.content)) && (
                        <m.div
                          layout
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
        ) : (
          <div className="h-full w-full max-w-4xl flex flex-col gap-10 justify-center items-center">
            {user ? (
              <>
                <LiveShareOverlay databaseId={databaseId} />
                <m.h3
                  layout
                  className="text-2xl font-light text-center"
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  What would you like to create?
                </m.h3>
              </>
            ) : (
              <m.div
                className="flex flex-col items-center gap-4 max-w-lg"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                animate="show"
              >
                <SignInButton />
                <p className="font-lighter text-center">
                  To prevent abuse we ask you to sign in before chatting with AI.
                </p>
                <p
                  className="underline cursor-pointer text-primary/50"
                  onClick={() => {
                    setIsSignInDialogOpen(true)
                  }}
                >
                  Why do I need to sign in?
                </p>
              </m.div>
            )}
          </div>
        )}
        <AnimatePresence>
          {!isSticky && (
            <m.div
              className="absolute bottom-5 left-1/2"
              variants={{
                hidden: { scale: 0 },
                show: { scale: 1 },
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
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-3 pb-1 relative">
        <AnimatePresence>
          {!user && !isLoadingUser && isConversationStarted && (
            <m.div
              className="flex flex-col items-center gap-4 max-w-lg my-4"
              variants={{
                hidden: { opacity: 0, y: 100 },
                show: { opacity: 1, y: 0 },
              }}
              animate="show"
              exit="hidden"
            >
              <SignInButton />
              <p className="font-lighter text-center text-sm">
                To prevent abuse we ask you to sign in before chatting with AI.
              </p>
              <p
                className="underline cursor-pointer text-sm text-primary/50"
                onClick={() => {
                  setIsSignInDialogOpen(true)
                }}
              >
                Why do I need to sign in?
              </p>
            </m.div>
          )}
        </AnimatePresence>
        <form
          className={cn(
            'flex py-2 px-3 rounded-[28px] bg-muted/50 border w-full max-w-4xl items-center gap-3',
            inputFocusState && 'border-muted-foreground',
            'transition'
          )}
          onSubmit={handleFormSubmit}
        >
          {/*
           * This is a hidden dummy message acting as an animation anchor
           * before the real message is added to the chat.
           *
           * The animation starts in this element's position and moves over to
           * the location of the real message after submit.
           *
           * It works by sharing the same `layoutId` between both message elements
           * which framer motion requires to animate between them.
           */}
          {input && (
            <m.div
              layout="position"
              layoutId={nextMessageId}
              className="absolute invisible -top-12 px-5 py-2.5 text-base rounded-3xl bg-neutral-100 whitespace-pre-wrap"
            >
              {input}
            </m.div>
          )}
          <Button
            type="button"
            variant={'ghost'}
            className="w-8 h-8 text-muted-foreground hover:text-foreground focus:text-foreground"
            size="icon"
            onClick={async (e) => {
              e.preventDefault()

              if (!user) {
                return
              }

              const file = await requestFileUpload()
              await sendCsv(file)
            }}
            disabled={!isChatEnabled}
          >
            <Paperclip size={16} strokeWidth={1.3} />
          </Button>
          <textarea
            ref={inputRef}
            id="input"
            name="prompt"
            autoComplete="off"
            className="flex-grow border-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/50 bg-transparent resize-none outline-none"
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
            rows={Math.min(input.split('\n').length, 10)}
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
          {isLoading ? (
            <Button
              className="rounded-full w-8 h-8 p-1.5 my-1 text-neutral-50 bg-neutral-800"
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
              className="rounded-full w-8 h-8 p-1.5 my-1 text-neutral-50 bg-neutral-800 disabled:bg-neutral-500 flex justify-center items-center"
              type="submit"
              disabled={!isSubmitEnabled}
            >
              <ArrowUp />
            </button>
          )}
        </form>
        <div className="text-xs text-neutral-500">
          AI can make mistakes. Check important information.
        </div>
      </div>
    </div>
  )
}

function LiveShareOverlay(props: { databaseId: string }) {
  const { liveShare } = useApp()

  if (liveShare.isLiveSharing && liveShare.databaseId === props.databaseId) {
    return (
      <div className="h-full w-full max-w-4xl absolute flex flex-col items-stretch justify-center backdrop-blur-sm bg-card/90 z-10">
        <div className="flex flex-col items-center justify-start gap-y-7 overflow-y-auto pt-20 pb-10">
          <div className="w-full text-left">
            <p className="text-lg">Access your in-browser database</p>
            <p className="text-xs text-muted-foreground">
              Closing the window will stop the Live Share session
            </p>
          </div>
          <Tabs defaultValue="uri" className="w-full justify-between bg-muted/50 rounded-md border">
            <TabsList className="w-full flex justify-start bg-transparent px-3">
              <TabsTrigger
                value="uri"
                className="hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-none! data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none relative cursor-pointer text-foreground-lighter flex items-center space-x-2 text-center transition focus:outline-none focus-visible:ring focus-visible:ring-foreground-muted focus-visible:border-foreground-muted  text-xs px-2.5 py-1"
              >
                URI
              </TabsTrigger>
              <TabsTrigger
                value="psql"
                className="hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-none! data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none relative cursor-pointer text-foreground-lighter flex items-center space-x-2 text-center transition focus:outline-none focus-visible:ring focus-visible:ring-foreground-muted focus-visible:border-foreground-muted  text-xs px-2.5 py-1"
              >
                PSQL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="uri" className="px-2 pb-2">
              <CopyableField
                value={`postgres://postgres@${liveShare.databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}/postgres?sslmode=require`}
              />
            </TabsContent>
            <TabsContent value="psql" className="px-2 pb-2">
              <CopyableField
                value={`psql "postgres://postgres@${liveShare.databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}/postgres?sslmode=require"`}
              />
            </TabsContent>
          </Tabs>

          {liveShare.clientIp ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span>
                Connected from <span className="text-card-foreground">{liveShare.clientIp}</span>
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
              <span>No client connected</span>
            </p>
          )}
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={() => {
              liveShare.stop()
            }}
          >
            <PlugIcon size={16} />
            <span>Stop sharing database</span>
          </Button>

          <div className="self-stretch border-b border-b-foreground/15 my-4" />

          <Accordion type="single" collapsible className="self-stretch flex flex-col gap-2">
            <AccordionItem value="postgres-clients" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>Can I connect using any Postgres client?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  Yes! Any standard Postgres client that communicates using the Postgres wire
                  protocol is supported. Connections are established over an encrypted TLS channel
                  using the SNI extension, so your client will also need to support TLS with SNI
                  (most modern clients support this).
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="concurrent-connections" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>How many concurrent connections can I have?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  PGlite operates in single-user mode, so you can only establish one connection at a
                  time per database. If you attempt to establish more than one connection using the
                  Live Share connection string, you will receive a &quot;too many clients&quot;
                  error.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="orms" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>Does this work with ORMs?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  Yes, as long as your ORM doesn&apos;t require multiple concurrent connections.
                  Some ORMs like Prisma run a shadow database in parallel to your main database in
                  order to generate migrations. In order to use Prisma, you will need to{' '}
                  <a
                    href="https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database#manually-configuring-the-shadow-database"
                    target="__blank"
                    rel="noopener noreferrer"
                  >
                    manually configure
                  </a>{' '}
                  your shadow database to point to another temporary database.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="connection-length" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>How long will connections last?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  You can connect over Live Share for as long as your browser tab is active. Once
                  your tab is closed, the any existing connection will terminate and you will no
                  longer be able to connect to your database using the connection string.
                </p>
                <p>
                  To prevent overloading the system, we also enforce a 5 minute idle timeout per
                  client connection and 1 hour total timeout per database. If you need to
                  communicate longer than these limits, simply reconnect after the timeout.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="under-the-hood" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>How does this work under the hood?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  We host a{' '}
                  <a
                    href="https://github.com/supabase-community/postgres-new/tree/main/apps/browser-proxy"
                    target="__blank"
                    rel="noopener noreferrer"
                  >
                    lightweight proxy
                  </a>{' '}
                  between your Postgres client and your in-browser PGlite database. It uses{' '}
                  <a
                    href="https://github.com/supabase-community/pg-gateway"
                    target="__blank"
                    rel="noopener noreferrer"
                  >
                    pg-gateway
                  </a>{' '}
                  to proxy inbound TCP connections to the corresponding browser instance via a Web
                  Socket reverse tunnel.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    )

    return null
  }
}

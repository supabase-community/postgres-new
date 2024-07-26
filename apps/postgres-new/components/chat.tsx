'use client'

import { Message, generateId } from 'ai'
import { useChat } from 'ai/react'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowDown, ArrowUp, Paperclip, Square } from 'lucide-react'
import {
  ChangeEvent,
  FormEventHandler,
  ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { TablesData } from '~/data/tables/tables-query'
import { saveFile } from '~/lib/files'
import { useAutoScroll, useReportSuggestions } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { AiIconAnimation } from './ai-icon-animation'
import ChatMessage from './chat-message'
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
          toolCallId: generateId(),
          toolName: 'getDatabaseSchema',
          args: {},
          result: tables,
        },
      ],
    },
  ]
}

type UseDropZoneOptions = {
  onDrop?(files: File[]): void
  cursorElement?: ReactNode
}

function useDropZone<T extends HTMLElement>({ onDrop, cursorElement }: UseDropZoneOptions = {}) {
  const [element, setElement] = useState<T>()
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  const cursorRef = useRef<HTMLElement>(null)

  const cursor = useMemo(() => {
    if (!isDraggingOver) {
      return undefined
    }

    const clonedCursor =
      cursorElement && isValidElement<any>(cursorElement)
        ? cloneElement(cursorElement, {
            ref: cursorRef,
            style: {
              ...cursorElement.props.style,
              pointerEvents: 'none',
              position: 'fixed',
            },
          })
        : undefined

    if (!clonedCursor) {
      return undefined
    }

    return createPortal(clonedCursor, document.body)
  }, [cursorElement, isDraggingOver])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()

      const items = e.dataTransfer?.items

      if (items) {
        const hasFile = Array.from(items).some((item) => item.kind === 'file')

        if (hasFile) {
          e.dataTransfer.dropEffect = 'copy'
          setIsDraggingOver(true)

          if (cursorRef.current) {
            cursorRef.current.style.left = `${e.clientX}px`
            cursorRef.current.style.top = `${e.clientY}px`
          }
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      }
    }

    function handleDragLeave() {
      setIsDraggingOver(false)
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()
      setIsDraggingOver(false)

      const items = e.dataTransfer?.items

      if (items) {
        const files = Array.from(items)
          .map((file) => file.getAsFile())
          .filter((file): file is File => !!file)

        onDrop?.(files)
      }
    }

    if (element) {
      element.addEventListener('dragover', handleDragOver)
      element.addEventListener('dragleave', handleDragLeave)
      element.addEventListener('drop', handleDrop)
    }

    return () => {
      element?.removeEventListener('dragover', handleDragOver)
      element?.removeEventListener('dragleave', handleDragLeave)
      element?.removeEventListener('drop', handleDrop)
    }
  }, [element, cursor, onDrop])

  return { ref, element, isDraggingOver, cursor }
}

type UseFollowMouseOptions<P extends HTMLElement> = {
  parentElement?: P
}

function useFollowMouse<T extends HTMLElement, P extends HTMLElement>({
  parentElement,
}: UseFollowMouseOptions<P>) {
  const [element, setElement] = useState<T>()

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      if (element) {
        element.style.left = `${e.offsetX}px`
        element.style.top = `${e.offsetY}px`
      }
    }

    if (element && parentElement) {
      parentElement.addEventListener('dragover', handleDragOver)
    }

    return () => {
      parentElement?.removeEventListener('dragover', handleDragOver)
    }
  }, [element, parentElement])

  return { ref }
}

export default function Chat() {
  const {
    databaseId,
    isLoadingMessages,
    isLoadingSchema,
    isConversationStarted,
    messages,
    appendMessage,
    stopReply,
  } = useWorkspace()

  const [brainstormIdeas] = useState(false) // temporarily turn off for now
  const { reports } = useReportSuggestions({ enabled: brainstormIdeas })

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
      const [file] = files

      if (file && file.type === 'text/csv') {
        await sendCsv(file)
      }
    },
    cursorElement: (
      <m.div
        layoutId={nextMessageId}
        className="px-5 py-2.5 text-base rounded-full bg-neutral-100 flex gap-2 items-center shadow-xl z-50"
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

  const isSubmitEnabled = !isLoadingMessages && !isLoadingSchema && Boolean(input.trim())

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
              !isMessageAnimationComplete ? 'overflow-x-hidden' : undefined
            )}
            ref={scrollRef}
          >
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
            <m.h3
              layout
              className="text-2xl font-light"
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              initial="hidden"
              animate="show"
            >
              What would you like to create?
            </m.h3>
            <div>
              {brainstormIdeas && (
                <>
                  {reports ? (
                    <m.div
                      className="flex flex-row gap-6 flex-wrap justify-center items-start"
                      variants={{
                        show: {
                          transition: {
                            staggerChildren: 0.05,
                          },
                        },
                      }}
                      initial="hidden"
                      animate="show"
                    >
                      {reports.map((report) => (
                        <m.div
                          key={report.name}
                          layoutId={`report-suggestion-${report.name}`}
                          className="w-64 h-32 flex flex-col overflow-ellipsis rounded-md cursor-pointer"
                          onMouseDown={() =>
                            appendMessage({ role: 'user', content: report.description })
                          }
                          variants={{
                            hidden: { scale: 0 },
                            show: { scale: 1 },
                          }}
                        >
                          <div className="p-4 bg-neutral-200 text-sm rounded-t-md text-neutral-600 font-bold text-center">
                            {report.name}
                          </div>
                          <div className="flex-1 p-4 flex flex-col justify-center border border-neutral-200 text-neutral-500 text-xs font-normal italic rounded-b-md text-center overflow-hidden">
                            {report.description}
                          </div>
                        </m.div>
                      ))}
                    </m.div>
                  ) : (
                    <m.div
                      className="flex flex-row gap-4 justify-center items-center"
                      variants={{
                        hidden: {
                          opacity: 0,
                          y: -10,
                        },
                        show: {
                          opacity: 1,
                          y: 0,
                          transition: {
                            delay: 0.5,
                          },
                        },
                      }}
                      initial="hidden"
                      animate="show"
                    >
                      <m.div layoutId="ai-loading-icon">
                        <AiIconAnimation loading />
                      </m.div>
                      <h3 className="text-lg italic font-light text-neutral-500">
                        Brainstorming some ideas
                      </h3>
                    </m.div>
                  )}
                </>
              )}
            </div>
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
      <div className="flex flex-col items-center gap-2 pb-2 relative">
        <form
          className="flex items-end py-2 px-3 rounded-[28px] bg-neutral-100 w-full max-w-4xl"
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
            className="w-8 h-8 p-1.5 my-1 bg-inherit"
            type="button"
            onClick={(e) => {
              e.preventDefault()

              // Create a file input element
              const fileInput = document.createElement('input')
              fileInput.type = 'file'
              fileInput.className = 'hidden'

              // Add an event listener to handle the file selection
              fileInput.addEventListener('change', async (event) => {
                const changeEvent = event as unknown as ChangeEvent<HTMLInputElement>
                const [file] = Array.from(changeEvent.target?.files ?? [])

                if (file && file.type === 'text/csv') {
                  await sendCsv(file)
                }

                fileInput.remove()
              })

              // Add the file input to the body (required for some browsers)
              document.body.appendChild(fileInput)

              // Trigger the click event on the file input element
              fileInput.click()
            }}
            disabled={isLoading}
          >
            <Paperclip size={20} />
          </Button>
          <textarea
            ref={inputRef}
            id="input"
            name="prompt"
            autoComplete="off"
            className="flex-grow border-none focus-visible:ring-0 text-base bg-inherit placeholder:text-neutral-400 resize-none"
            value={input}
            onChange={handleInputChange}
            placeholder="Message AI"
            autoFocus
            rows={Math.min(input.split('\n').length, 10)}
            onKeyDown={(e) => {
              if (!(e.target instanceof HTMLTextAreaElement)) {
                return
              }

              if (e.key === 'Enter' && !e.shiftKey) {
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
            <Button
              className="rounded-full w-8 h-8 p-1.5 my-1 text-neutral-50 bg-neutral-800"
              type="submit"
              disabled={!isSubmitEnabled}
            >
              <ArrowUp />
            </Button>
          )}
        </form>
        <div className="text-xs text-neutral-500">
          AI can make mistakes. Check important information.
        </div>
      </div>
    </div>
  )
}

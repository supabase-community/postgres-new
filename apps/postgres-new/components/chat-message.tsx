'use client'

import { Message } from 'ai'
import { m } from 'framer-motion'
import Image from 'next/image'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { isAutomatedUserMessage } from '~/lib/util'
import { cn } from '~/lib/utils'
import { CodeBlock } from './code-block'
import { ToolUi } from './tools'

export type ChatMessageProps = {
  message: Message
  isLast: boolean
}

function ChatMessage({ message, isLast }: ChatMessageProps) {
  switch (message.role) {
    case 'user':
      if (isAutomatedUserMessage(message)) {
        return null
      }

      return (
        <m.div
          // Only track layout on the last message to improve performance
          layoutId={isLast ? message.id : undefined}
          variants={{
            hidden: {
              opacity: 0,
              x: -50,
            },
            show: {
              opacity: 1,
              x: 0,
            },
          }}
          className="self-end px-5 py-2.5 text-base rounded-3xl bg-border text-foreground whitespace-pre-wrap"
        >
          {message.content}
        </m.div>
      )
    case 'assistant':
      const markdown = message.content ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
          rehypePlugins={[[rehypeKatex, { output: 'html' }]]}
          components={{ ...markdownComponents, img: () => null }}
          className="prose prose-xs text-base [&_.katex-display>.katex]:text-left"
        >
          {message.content}
        </ReactMarkdown>
      ) : null

      const toolElements =
        message.toolInvocations
          ?.map((toolInvocation) => (
            <ToolUi key={toolInvocation.toolCallId} toolInvocation={toolInvocation as any} />
          ))
          .filter(Boolean) ?? []

      if (!markdown && toolElements.length === 0) {
        return null
      }

      return (
        <m.div
          className="ml-4 self-stretch flex flex-col items-stretch gap-6"
          variants={{
            hidden: {
              opacity: 0,
              x: 50,
            },
            show: {
              opacity: 1,
              x: 0,
            },
          }}
        >
          {markdown}
          {toolElements}
        </m.div>
      )
  }
}

// Memoizing is important here - otherwise React continually
// re-renders previous messages unnecessarily (big performance hit)
export default memo(ChatMessage, (prevProps, nextProps) => {
  // Always re-render the last message to fix a bug where `useChat()`
  // doesn't trigger a re-render when multiple tool calls are added
  // to the same message. Otherwise shallow compare.
  return (
    !nextProps.isLast &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.message === nextProps.message
  )
})

const NextImageHandler = (props: any) => {
  return (
    <span className={cn('next-image--dynamic-fill', props.className)}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image {...props} className={['rounded-md border'].join(' ')} layout="fill" />
    </span>
  )
}

const markdownComponents = {
  mono: (props: any) => <code className="text-sm not-prose">{props.children}</code>,
  code: (props: any) => <CodeBlock {...props} />,
  pre: (props: any) => (
    <pre className="not-prose">
      <CodeBlock {...props} />
    </pre>
  ),
  img: (props: any) => NextImageHandler(props),
  Image: (props: any) => NextImageHandler(props),
}

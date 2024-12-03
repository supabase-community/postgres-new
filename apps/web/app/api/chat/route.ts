import { createOpenAI } from '@ai-sdk/openai'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'
import { convertToCoreMessages, streamText, ToolInvocation, ToolResultPart } from 'ai'
import { getSystemPrompt } from '~/lib/system-prompt'
import { convertToCoreTools, maxMessageContext, tools } from '~/lib/tools'
import { createClient } from '~/utils/supabase/server'
import { ChatInferenceEventToolResult, logEvent } from '~/utils/telemetry'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const inputTokenRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.fixedWindow(1000000, '30m'),
  prefix: 'ratelimit:tokens:input',
})

const outputTokenRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.fixedWindow(10000, '30m'),
  prefix: 'ratelimit:tokens:output',
})

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: (ToolInvocation & { result: any })[]
}

const chatModel = process.env.OPENAI_MODEL ?? 'gpt-4o-2024-08-06'

// Configure OpenAI client with custom base URL
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1',
  compatibility: 'strict',
})

export async function POST(req: Request) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.getUser()

  // We have middleware, so this should never happen (used for type narrowing)
  if (error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const {
    user: { id: userId },
  } = data

  const { remaining: inputTokensRemaining } = await inputTokenRateLimit.getRemaining(userId)
  const { remaining: outputTokensRemaining } = await outputTokenRateLimit.getRemaining(userId)

  const { messages, databaseId }: { messages: Message[]; databaseId: string } = await req.json()

  if (inputTokensRemaining <= 0 || outputTokensRemaining <= 0) {
    logEvent('chat-rate-limit', {
      databaseId,
      userId,
      inputTokensRemaining,
      outputTokensRemaining,
    })
    return new Response('Rate limited', { status: 429 })
  }

  // Trim the message context sent to the LLM to mitigate token abuse
  const trimmedMessageContext = messages.slice(-maxMessageContext)

  const coreMessages = convertToCoreMessages(trimmedMessageContext)
  const coreTools = convertToCoreTools(tools)

  const result = streamText({
    system: getSystemPrompt(),
    model: openai(chatModel),
    messages: coreMessages,
    tools: coreTools,
    async onFinish({ usage, finishReason, toolCalls }) {
      await inputTokenRateLimit.limit(userId, {
        rate: usage.promptTokens,
      })
      await outputTokenRateLimit.limit(userId, {
        rate: usage.completionTokens,
      })

      // The last message should always be an input message (user message or tool result)
      const inputMessage = coreMessages.at(-1)
      if (!inputMessage || (inputMessage.role !== 'user' && inputMessage.role !== 'tool')) {
        return
      }

      // `tool` role indicates a tool result, `user` role indicates a user message
      const inputType = inputMessage.role === 'tool' ? 'tool-result' : 'user-message'
      const toolResults =
        inputMessage.role === 'tool'
          ? inputMessage.content
              .map((toolResult) => getEventToolResult(toolResult))
              .filter((eventToolResult) => eventToolResult !== undefined)
          : undefined

      // +1 for the assistant message just received
      const messageCount = coreMessages.length + 1

      logEvent('chat-inference', {
        databaseId,
        userId,
        messageCount,
        inputType,
        toolResults,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        finishReason,
        toolCalls: toolCalls?.map((toolCall) => toolCall.toolName),
      })
    },
  })

  return result.toDataStreamResponse()
}

function getEventToolResult(toolResult: ToolResultPart): ChatInferenceEventToolResult | undefined {
  try {
    if (
      !('result' in toolResult) ||
      !toolResult.result ||
      typeof toolResult.result !== 'object' ||
      !('success' in toolResult.result) ||
      typeof toolResult.result.success !== 'boolean'
    ) {
      return undefined
    }

    const {
      toolName,
      result: { success },
    } = toolResult

    return {
      toolName,
      success,
    }
  } catch (error) {
    return undefined
  }
}

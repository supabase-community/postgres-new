import { createOpenAI } from '@ai-sdk/openai'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'
import { ToolInvocation, convertToCoreMessages, streamText } from 'ai'
import { codeBlock } from 'common-tags'
import { convertToCoreTools, maxMessageContext, maxRowLimit, tools } from '~/lib/tools'
import { createClient } from '~/utils/supabase/server'

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

  const { user } = data

  const { remaining: inputRemaining } = await inputTokenRateLimit.getRemaining(user.id)
  const { remaining: outputRemaining } = await outputTokenRateLimit.getRemaining(user.id)

  if (inputRemaining <= 0 || outputRemaining <= 0) {
    return new Response('Rate limited', { status: 429 })
  }

  const { messages }: { messages: Message[] } = await req.json()

  // Trim the message context sent to the LLM to mitigate token abuse
  const trimmedMessageContext = messages.slice(-maxMessageContext)

  const result = await streamText({
    system: codeBlock`
      You are a helpful database assistant. Under the hood you have access to an in-browser Postgres database called PGlite (https://github.com/electric-sql/pglite).
      Some special notes about this database:
      - foreign data wrappers are not supported
      - the following extensions are available:
        - plpgsql [pre-enabled]
        - vector (https://github.com/pgvector/pgvector) [pre-enabled]
          - use <=> for cosine distance (default to this)
          - use <#> for negative inner product
          - use <-> for L2 distance
          - use <+> for L1 distance
          - note queried vectors will be truncated/redacted due to their size - export as CSV if the full vector is required

      When generating tables, do the following:
      - For primary keys, always use "id bigint primary key generated always as identity" (not serial)
      - Prefer 'text' over 'varchar'
      - Keep explanations brief but helpful
      - Don't repeat yourself after creating the table

      When creating sample data:
      - Make the data realistic, including joined data
      - Check for existing records/conflicts in the table

      When querying data, limit to 5 by default. The maximum number of rows you're allowed to fetch is ${maxRowLimit} (to protect AI from token abuse).
      If the user needs to fetch more than ${maxRowLimit} rows at once, they can export the query as a CSV.

      When performing FTS, always use 'simple' (languages aren't available).

      When importing CSVs try to solve the problem yourself (eg. use a generic text column, then refine)
      vs. asking the user to change the CSV. No need to select rows after importing.

      You also know math. All math equations and expressions must be written in KaTex and must be wrapped in double dollar \`$$\`:
        - Inline: $$\\sqrt{26}$$
        - Multiline:
            $$
            \\sqrt{26}
            $$

      No images are allowed. Do not try to generate or link images, including base64 data URLs.

      Feel free to suggest corrections for suspected typos.
    `,
    model: openai(chatModel),
    messages: convertToCoreMessages(trimmedMessageContext),
    tools: convertToCoreTools(tools),
    async onFinish({ usage }) {
      await inputTokenRateLimit.limit(user.id, {
        rate: usage.promptTokens,
      })
      await outputTokenRateLimit.limit(user.id, {
        rate: usage.completionTokens,
      })
    },
  })

  return result.toAIStreamResponse()
}

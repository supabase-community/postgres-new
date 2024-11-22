import { createOpenAI } from '@ai-sdk/openai'
import * as kv from 'idb-keyval'
import { convertToCoreMessages, streamText, ToolInvocation } from 'ai'
import { codeBlock } from 'common-tags'
import { convertToCoreTools, maxMessageContext, maxRowLimit, tools } from './lib/tools'
import type { ModelProvider } from './components/model-provider/use-model-provider'

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: (ToolInvocation & { result: any })[]
}

declare const self: ServiceWorkerGlobalScope

async function handleRequest(event: FetchEvent) {
  const externalModel = (await kv.get('modelProvider')) as ModelProvider | undefined
  const url = new URL(event.request.url)
  const isChatRoute = url.pathname === '/api/chat' && event.request.method === 'POST'

  if (externalModel && isChatRoute) {
    const adapter = createOpenAI({
      baseURL: externalModel.baseUrl,
      apiKey: externalModel.apiKey,
    })
    const model = adapter(externalModel.model)

    const { messages }: { messages: Message[] } = await event.request.json()

    // Trim the message context sent to the LLM to mitigate token abuse
    const trimmedMessageContext = messages.slice(-maxMessageContext)

    const coreMessages = convertToCoreMessages(trimmedMessageContext)
    const coreTools = convertToCoreTools(tools)

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
      model,
      messages: coreMessages,
      tools: coreTools,
      onFinish: (event) => {
        console.log('Hello from service worker', event)
      },
    })
    return result.toAIStreamResponse()
  }

  return fetch(event.request)
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})

import { createOpenAI } from '@ai-sdk/openai'
import { convertToCoreMessages, streamText, ToolInvocation } from 'ai'
import * as kv from 'idb-keyval'
import { getConfigStore, type ModelProvider } from '~/components/model-provider/use-model-provider'
import { convertToCoreTools, maxMessageContext, tools } from '~/lib/tools'

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: (ToolInvocation & { result: any })[]
}

declare const self: ServiceWorkerGlobalScope

async function handleRequest(event: FetchEvent) {
  const url = new URL(event.request.url)
  const isChatRoute = url.pathname.startsWith('/api/chat') && event.request.method === 'POST'
  if (isChatRoute) {
    const modelProvider = await kv.get<ModelProvider>('modelProvider', getConfigStore())

    if (!modelProvider?.enabled) {
      return fetch(event.request)
    }

    const adapter = createOpenAI({
      baseURL: modelProvider.baseUrl,
      apiKey: modelProvider.apiKey,
    })

    const model = adapter(modelProvider.model)

    const { messages }: { messages: Message[] } = await event.request.json()

    // Trim the message context sent to the LLM to mitigate token abuse
    const trimmedMessageContext = messages.slice(-maxMessageContext)

    const coreMessages = convertToCoreMessages(trimmedMessageContext)
    const coreTools = convertToCoreTools(tools)

    try {
      const result = streamText({
        system: modelProvider.system,
        model,
        messages: coreMessages,
        tools: coreTools,
      })

      return result.toDataStreamResponse()
    } catch (error) {
      return new Response(`Error streaming LLM from service worker: ${error}`, { status: 500 })
    }
  }

  return fetch(event.request)
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})

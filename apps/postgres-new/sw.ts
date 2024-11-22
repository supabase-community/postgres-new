import { createOpenAI } from '@ai-sdk/openai'
import { ollama } from 'ollama-ai-provider'
import * as kv from 'idb-keyval'
import { convertToCoreMessages, streamText, ToolInvocation } from 'ai'
import { convertToCoreTools, maxMessageContext, tools } from './lib/tools'
import type { ModelProvider } from './components/model-provider/use-model-provider'

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
    const modelProvider = (await kv.get('modelProvider')) as ModelProvider | undefined

    if (!modelProvider?.enabled) {
      return fetch(event.request)
    }

    const adapter =
      modelProvider.baseUrl === 'http://localhost:11434/api'
        ? ollama
        : createOpenAI({
            baseURL: modelProvider.baseUrl,
            apiKey: modelProvider.apiKey,
          })
    const model = adapter(modelProvider.model)

    const { messages }: { messages: Message[] } = await event.request.json()

    // Trim the message context sent to the LLM to mitigate token abuse
    const trimmedMessageContext = messages.slice(-maxMessageContext)

    const coreMessages = convertToCoreMessages(trimmedMessageContext)
    const coreTools = convertToCoreTools(tools)

    const result = streamText({
      system: modelProvider.system,
      model,
      messages: coreMessages,
      tools: coreTools,
      onFinish: (event) => {
        console.log('Hello from service worker', event)
      },
    })
    return result.toDataStreamResponse()
  }

  return fetch(event.request)
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})

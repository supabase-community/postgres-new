/**
 * Event for an AI chat rate limit. Includes the
 * remaining input and output tokens in the rate
 * limit window (one of these will be <= 0).
 */
export type ChatRateLimitEvent = {
  type: 'chat-rate-limit'
  metadata: {
    databaseId: string
    userId: string
    inputTokensRemaining: number
    outputTokensRemaining: number
  }
}

export type ChatInferenceEventToolResult = {
  toolName: string
  success: boolean
}

/**
 * Event for an AI chat inference request-response.
 * Includes both input and output metadata.
 */
export type ChatInferenceEvent = {
  type: 'chat-inference'
  metadata: {
    databaseId: string
    userId: string
    messageCount: number
    inputType: 'user-message' | 'tool-result'
    toolResults?: ChatInferenceEventToolResult[]
    inputTokens: number
    outputTokens: number
    finishReason:
      | 'stop'
      | 'length'
      | 'content-filter'
      | 'tool-calls'
      | 'error'
      | 'other'
      | 'unknown'
    toolCalls?: string[]
  }
}

export type TelemetryEvent = ChatRateLimitEvent | ChatInferenceEvent

export async function logEvent<E extends TelemetryEvent>(type: E['type'], metadata: E['metadata']) {
  if (!process.env.LOGFLARE_SOURCE || !process.env.LOGFLARE_API_KEY) {
    if (process.env.DEBUG) {
      console.log(type, metadata)
    }
    return
  }

  const response = await fetch(
    `https://api.logflare.app/logs?source=${process.env.LOGFLARE_SOURCE}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.LOGFLARE_API_KEY,
      },
      body: JSON.stringify({
        event_message: type,
        metadata,
      }),
    }
  )

  if (!response.ok) {
    const { error } = await response.json()
    console.error('failed to send logflare event', error)
  }
}

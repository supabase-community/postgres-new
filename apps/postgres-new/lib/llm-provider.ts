const providerUrlMap = new Map([
  ['openai', 'https://api.openai.com/v1'],
  ['x-ai', 'https://api.x.ai/v1'],
  ['openrouter', 'https://openrouter.ai/api/v1'],
] as const)

type MapKeys<T> = T extends Map<infer K, any> ? K : never

export type Provider = MapKeys<typeof providerUrlMap>

export function getProviderUrl(provider: Provider) {
  const url = providerUrlMap.get(provider)

  if (!url) {
    throw new Error(`unknown provider: ${provider}`)
  }

  return url
}

export function getProviderId(apiUrl: string): Provider | undefined {
  for (const [key, value] of providerUrlMap.entries()) {
    if (value === apiUrl) {
      return key
    }
  }
}

import { useEffect, useState, useCallback } from 'react'
import * as kv from 'idb-keyval'

export type ModelProvider = {
  apiKey?: string
  model: string
  baseUrl: string
}

export function useModelProvider() {
  const [modelProvider, setModelProvider] = useState<ModelProvider | undefined>()

  const set = useCallback(async (modelProvider: ModelProvider) => {
    await kv.set('modelProvider', modelProvider)
    setModelProvider(modelProvider)
  }, [])

  const remove = useCallback(async () => {
    await kv.del('modelProvider')
    setModelProvider(undefined)
  }, [])

  useEffect(() => {
    async function init() {
      const modelProvider = await kv.get('modelProvider')
      setModelProvider(modelProvider)
    }
    init()
  }, [setModelProvider])

  return {
    state: modelProvider,
    set,
    delete: remove,
  }
}

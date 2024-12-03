import { useEffect, useState, useCallback } from 'react'
import * as kv from 'idb-keyval'

export type ModelProvider = {
  apiKey?: string
  model: string
  baseUrl: string
  system: string
  enabled: boolean
}

let configStore: kv.UseStore

export function getConfigStore() {
  if (configStore) {
    return configStore
  }
  configStore = kv.createStore('/database.build/config', 'config')
  return configStore
}

export function useModelProvider() {
  const [modelProvider, setModelProvider] = useState<ModelProvider | undefined>()

  const set = useCallback(async (modelProvider: ModelProvider) => {
    await kv.set('modelProvider', modelProvider, getConfigStore())
    setModelProvider(modelProvider)
  }, [])

  const remove = useCallback(async () => {
    await kv.del('modelProvider', getConfigStore())
    setModelProvider(undefined)
  }, [])

  useEffect(() => {
    async function init() {
      const modelProvider = await kv.get('modelProvider', getConfigStore())
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

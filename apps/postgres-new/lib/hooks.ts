'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FeatureExtractionPipelineOptions, pipeline } from '@xenova/transformers'
import { generateId } from 'ai'
import { Chart } from 'chart.js'
import { codeBlock } from 'common-tags'
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useTablesQuery } from '~/data/tables/tables-query'
import { getDb } from './db'
import { loadFile, saveFile } from './files'
import { SmoothScroller } from './smooth-scroller'
import { OnToolCall } from './tools'

/**
 * Hook to load/store values from local storage with an API similar
 * to `useState()`.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const queryClient = useQueryClient()
  const queryKey = ['local-storage', key]

  const currentValue =
    typeof window !== 'undefined' ? (window.localStorage.getItem(key) ?? undefined) : undefined

  const { data: storedValue = currentValue ? (JSON.parse(currentValue) as T) : initialValue } =
    useQuery({
      queryKey,
      queryFn: () => {
        if (typeof window === 'undefined') {
          return initialValue
        }

        const item = window.localStorage.getItem(key)

        if (!item) {
          window.localStorage.setItem(key, JSON.stringify(initialValue))
          return initialValue
        }

        return JSON.parse(item) as T
      },
    })

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    }

    queryClient.setQueryData(queryKey, valueToStore)
    queryClient.invalidateQueries({ queryKey })
  }

  return [storedValue, setValue] as const
}

export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export type UseAutoScrollProps = {
  enabled?: boolean
}

/**
 * Automatically scroll a container to the bottom as new
 * content is added to it.
 */
export function useAutoScroll({ enabled = true }: UseAutoScrollProps = {}) {
  // Store container element in state so that we can
  // mount/dismount handlers via `useEffect` (see below)
  const [container, setContainer] = useState<HTMLDivElement>()

  const scroller = useMemo(() => {
    if (container) {
      return new SmoothScroller(container)
    }
  }, [container])

  // Maintain `isSticky` state for the consumer to access
  const [isSticky, setIsSticky] = useState(true)

  // Maintain `isStickyRef` value for internal use
  // that isn't limited to React's state lifecycle
  const isStickyRef = useRef(isSticky)

  const ref = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      setContainer(element)
    }
  }, [])

  // Convenience function to allow consumers to
  // scroll to the bottom of the container
  const scrollToEnd = useCallback(() => {
    if (container && scroller) {
      isStickyRef.current = true

      // Update state so that consumers can hook into sticky status
      setIsSticky(isStickyRef.current)

      // TODO: support duration greater than 0
      scroller.scrollTo(container.scrollHeight - container.clientHeight, 0)
    }
  }, [container, scroller])

  useEffect(() => {
    let resizeObserver: ResizeObserver | undefined
    let mutationObserver: MutationObserver | undefined
    let lastScrollTop: number
    let lastScrollHeight: number

    function onScrollStart(e: Event) {
      if (container && scroller) {
        // TODO: understand where these phantom scroll/height changes occur
        if (lastScrollHeight !== undefined && container.scrollHeight !== lastScrollHeight) {
          return
        }

        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight
        const hasScrolledUp = container.scrollTop < lastScrollTop

        if (hasScrolledUp) {
          scroller.cancel()
        }

        // We're sticky if we're in the middle of an automated scroll
        // or if the user manually scrolled to the bottom
        isStickyRef.current = !hasScrolledUp && (scroller.isAnimating || isAtBottom)

        // Update state so that consumers can hook into sticky status
        setIsSticky(isStickyRef.current)
      }
    }

    if (container) {
      container.addEventListener('scroll', onScrollStart)

      if (enabled) {
        // Scroll when the container's children resize
        resizeObserver = new ResizeObserver(() => {
          lastScrollTop = container.scrollTop
          lastScrollHeight = container.scrollHeight

          if (isStickyRef.current) {
            scrollToEnd()
          }
        })

        // Monitor the size of the children within the scroll container
        for (const child of Array.from(container.children)) {
          resizeObserver.observe(child)
        }
      }
    }

    return () => {
      container?.removeEventListener('scroll', onScrollStart)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [container, scroller, scrollToEnd, enabled])

  return { ref, isSticky, scrollToEnd }
}

export function useAsyncMemo<T>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList,
  initialValue: T | undefined = undefined
) {
  const [value, setValue] = useState<T | undefined>(initialValue)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)

  const hasBeenCancelled = useRef(false)

  useEffect(() => {
    hasBeenCancelled.current = false
    setLoading(true)

    asyncFunction()
      .then((result) => {
        if (!hasBeenCancelled.current) {
          setValue(result)
          setError(undefined)
        }
      })
      .catch((err) => {
        if (!hasBeenCancelled.current) {
          setError(err)
        }
      })
      .finally(() => {
        if (!hasBeenCancelled.current) {
          setLoading(false)
        }
      })

    return () => {
      hasBeenCancelled.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { value, error, loading }
}

export function useOnToolCall(databaseId: string) {
  const { refetch: refetchTables } = useTablesQuery({
    databaseId,
    schemas: ['public', 'meta'],
  })
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const { value: vectorDataTypeId } = useAsyncMemo(async () => {
    const db = await getDb(databaseId)
    const sql = codeBlock`
      select
        typname,
        oid
      from
        pg_type
      where
        typname = 'vector';
    `

    const result = await db.query<{ oid: number }>(sql)
    const [{ oid }] = result.rows

    return oid
  }, [databaseId])

  return useCallback<OnToolCall>(
    async ({ toolCall }) => {
      const db = await getDb(databaseId)

      switch (toolCall.toolName) {
        case 'getDatabaseSchema': {
          const { data: tables, error } = await refetchTables()

          // TODO: handle this error in the UI
          if (error) {
            throw error
          }

          return {
            success: true,
            tables,
          }
        }
        case 'renameConversation': {
          const { name } = toolCall.args

          try {
            await updateDatabase({ id: databaseId, name, isHidden: false })

            return {
              success: true,
              message: 'Database conversation has been successfully renamed.',
            }
          } catch (err) {
            return {
              success: false,
              message: err instanceof Error ? err.message : 'An unknown error occurred',
            }
          }
        }
        case 'brainstormReports': {
          return {
            success: true,
            message: 'Reports have been brainstormed. Relay this info to the user.',
          }
        }
        case 'executeSql': {
          try {
            const { sql } = toolCall.args

            const results = await db.exec(sql)

            // Truncate vector columns due to their large size
            const filteredResults = results.map((result) => {
              const vectorFields = result.fields.filter(
                (field) => field.dataTypeID === vectorDataTypeId
              )

              return {
                ...result,
                rows: result.rows.map((row) =>
                  Object.entries(row).reduce(
                    (merged, [key, value]) => ({
                      ...merged,
                      [key]: vectorFields.some((field) => field.name === key)
                        ? `[${JSON.parse(value).slice(0, 3).join(',')},...]`
                        : value,
                    }),
                    {}
                  )
                ),
              }
            })

            const { data: tables, error } = await refetchTables()

            // TODO: handle this error in the UI
            if (error) {
              throw error
            }

            return {
              success: true,
              queryResults: filteredResults,
              updatedSchema: tables,
            }
          } catch (err) {
            if (err instanceof Error) {
              return { success: false, error: err.message }
            }
            throw err
          }
        }
        case 'generateChart': {
          // TODO: correct zod schema for Chart.js `config`
          const { config } = toolCall.args as any

          // Validate that the chart can be rendered without error
          const canvas = document.createElement('canvas', {})
          canvas.className = 'invisible'
          document.body.appendChild(canvas)

          try {
            const chart = new Chart(canvas, config)
            chart.destroy()
            return {
              success: true,
              message:
                "The chart has been generated and displayed to the user above. Acknowledge the user's request.",
            }
          } catch (err) {
            if (err instanceof Error) {
              return { success: false, error: err.message }
            }
            throw err
          } finally {
            canvas.remove()
          }
        }
        case 'importCsv': {
          const { fileId, sql } = toolCall.args

          try {
            const file = await loadFile(fileId)
            await db.exec(sql, { blob: file })
            await refetchTables()

            return {
              success: true,
              message: 'The CSV has been imported successfully.',
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
        case 'exportCsv': {
          const { fileName, sql } = toolCall.args
          const fileId = generateId()

          try {
            const [result] = await db.exec(sql)

            if (!result.blob) {
              return {
                success: false,
                error: 'Failed to export CSV from the database',
              }
            }

            const file = new File([result.blob], fileName, { type: 'text/csv' })
            await saveFile(fileId, file)

            return {
              success: true,
              message: 'The query as been successfully exported as a CSV. Do not link to it.',
              fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
              },
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
        case 'embed': {
          const { texts } = toolCall.args

          try {
            const tensor = await embed(texts, {
              normalize: true,
              pooling: 'mean',
            })

            const embeddings: number[][] = tensor.tolist()

            const sql = codeBlock`
              insert into meta.embeddings
                (content, embedding)
              values
                ${embeddings.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',')}
              returning
                id;
            `

            const params = embeddings.flatMap((embedding, i) => [
              texts[i],
              `[${embedding.join(',')}]`,
            ])

            const results = await db.query<{ id: number }>(sql, params)
            const ids = results.rows.map(({ id }) => id)

            return {
              success: true,
              ids,
            }
          } catch (error) {
            console.error(error)

            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
      }
    },
    [refetchTables, updateDatabase, databaseId, vectorDataTypeId]
  )
}

const embedPromise = pipeline('feature-extraction', 'supabase/gte-small', {
  quantized: true,
})

export async function embed(texts: string | string[], options?: FeatureExtractionPipelineOptions) {
  const embedFn = await embedPromise
  return embedFn(texts, options)
}

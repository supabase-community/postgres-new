'use client'

import { generateId } from 'ai'
import { Chart } from 'chart.js'
import { codeBlock } from 'common-tags'
import {
  cloneElement,
  isValidElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '~/components/app-provider'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useTablesQuery } from '~/data/tables/tables-query'
import { embed } from './embed'
import { loadFile, saveFile } from './files'
import { SmoothScroller } from './smooth-scroller'
import { maxRowLimit, OnToolCall } from './tools'

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
  const { dbManager } = useApp()
  const { refetch: refetchTables } = useTablesQuery({
    databaseId,
    schemas: ['public', 'meta'],
  })
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const { value: vectorDataTypeId } = useAsyncMemo(async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }
    const db = await dbManager.getDbInstance(databaseId)
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
  }, [dbManager, databaseId])

  return useCallback<OnToolCall>(
    async ({ toolCall }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      const db = await dbManager.getDbInstance(databaseId)

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

            const oversizedResult = results.find((result) => result.rows.length > maxRowLimit)

            // We have a max row count in place to mitigate LLM token abuse
            if (oversizedResult) {
              return {
                success: false,
                error: `Query produced ${oversizedResult.rows.length} rows but the max allowed limit is ${maxRowLimit}. Rerun the query with a limit of ${maxRowLimit}.`,
              }
            }

            // Truncate vector columns due to their large size (display purposes only)
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
            const embeddings = await embed(texts, {
              normalize: true,
              pooling: 'mean',
            })

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
    [dbManager, refetchTables, updateDatabase, databaseId, vectorDataTypeId]
  )
}

export type UseDropZoneOptions = {
  onDrop?(files: File[]): void
  cursorElement?: ReactNode
}

export function useDropZone<T extends HTMLElement>({
  onDrop,
  cursorElement,
}: UseDropZoneOptions = {}) {
  const [element, setElement] = useState<T>()
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  const cursorRef = useRef<HTMLElement>(null)

  const cursor = useMemo(() => {
    if (!isDraggingOver) {
      return undefined
    }

    const clonedCursor =
      cursorElement && isValidElement<any>(cursorElement)
        ? cloneElement(cursorElement, {
            ref: cursorRef,
            style: {
              ...cursorElement.props.style,
              pointerEvents: 'none',
              position: 'fixed',
            },
          })
        : undefined

    if (!clonedCursor) {
      return undefined
    }

    return createPortal(clonedCursor, document.body)
  }, [cursorElement, isDraggingOver])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()

      const items = e.dataTransfer?.items

      if (items) {
        const hasFile = Array.from(items).some((item) => item.kind === 'file')

        if (hasFile) {
          e.dataTransfer.dropEffect = 'copy'
          setIsDraggingOver(true)

          if (cursorRef.current) {
            cursorRef.current.style.left = `${e.clientX}px`
            cursorRef.current.style.top = `${e.clientY}px`
          }
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      }
    }

    function handleDragLeave() {
      setIsDraggingOver(false)
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()
      setIsDraggingOver(false)

      const items = e.dataTransfer?.items

      if (items) {
        const files = Array.from(items)
          .map((file) => file.getAsFile())
          .filter((file): file is File => !!file)

        onDrop?.(files)
      }
    }

    if (element) {
      element.addEventListener('dragover', handleDragOver)
      element.addEventListener('dragleave', handleDragLeave)
      element.addEventListener('drop', handleDrop)
    }

    return () => {
      element?.removeEventListener('dragover', handleDragOver)
      element?.removeEventListener('dragleave', handleDragLeave)
      element?.removeEventListener('drop', handleDrop)
    }
  }, [element, cursor, onDrop])

  return { ref, element, isDraggingOver, cursor }
}

export type UseFollowMouseOptions<P extends HTMLElement> = {
  parentElement?: P
}

export function useFollowMouse<T extends HTMLElement, P extends HTMLElement>({
  parentElement,
}: UseFollowMouseOptions<P>) {
  const [element, setElement] = useState<T>()

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      if (element) {
        element.style.left = `${e.offsetX}px`
        element.style.top = `${e.offsetY}px`
      }
    }

    if (element && parentElement) {
      parentElement.addEventListener('dragover', handleDragOver)
    }

    return () => {
      parentElement?.removeEventListener('dragover', handleDragOver)
    }
  }, [element, parentElement])

  return { ref }
}

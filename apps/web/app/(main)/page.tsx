'use client'

import { customAlphabet } from 'nanoid'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useApp } from '~/components/app-provider'
import Workspace from '~/components/workspace'
import { useDatabaseCreateMutation } from '~/data/databases/database-create-mutation'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'

// Use a DNS safe alphabet
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

function uniqueId() {
  return nanoid()
}

export default function Page() {
  const { dbManager } = useApp()
  const router = useRouter()

  const { mutateAsync: createDatabase } = useDatabaseCreateMutation()
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  /**
   * Preloads next empty database so that it is ready immediately.
   */
  const preloadDb = useCallback(
    async (id: string) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      const database = await dbManager.getDatabase(id)
      if (!database) {
        await createDatabase({ id, isHidden: true })
        await dbManager.getDbInstance(id)
      }
    },
    [dbManager, createDatabase]
  )

  // Track the next database ID in local storage
  const nextDatabaseId = useMemo(() => {
    const id = uniqueId()

    // To prevent Next.js from failing SSR
    if (typeof window === 'undefined') {
      return id
    }

    // For historical reasons this value exists as JSON
    let idJson = localStorage.getItem('next-db-id')
    if (idJson) {
      return JSON.parse(idJson)
    }

    localStorage.setItem('next-db-id', JSON.stringify(id))
    return id
  }, [])

  // The very first DB needs to be loaded on mount
  useEffect(() => {
    preloadDb(nextDatabaseId)
  }, [nextDatabaseId, preloadDb])

  return (
    <Workspace
      databaseId={nextDatabaseId}
      visibility="local"
      onMessage={async () => {
        // Make the DB no longer hidden
        await updateDatabase({ id: nextDatabaseId, name: null, isHidden: false })

        // Pre-load the next DB
        const nextId = uniqueId()
        localStorage.setItem('next-db-id', JSON.stringify(nextId))
        preloadDb(nextId)
      }}
      onReply={async (message, append) => {
        if (!dbManager) {
          throw new Error('dbManager is not available')
        }

        const messages = await dbManager.getMessages(nextDatabaseId)
        const isFirstReplyComplete =
          !messages.some((message) => message.role === 'assistant' && !message.toolInvocations) &&
          message.role === 'assistant' &&
          !message.toolInvocations

        // The model might run multiple tool calls before ending with a message, so
        // we only want to redirect after all of these back-to-back calls finish
        if (isFirstReplyComplete) {
          router.push(`/db/${nextDatabaseId}`)

          append({
            role: 'user',
            content: 'Name this conversation. No need to reply.',
            data: {
              automated: true,
            },
          })
        }
      }}
      onCancelReply={(append) => {
        router.push(`/db/${nextDatabaseId}`)

        append({
          role: 'user',
          content: 'Name this conversation. No need to reply.',
          data: {
            automated: true,
          },
        })
      }}
    />
  )
}

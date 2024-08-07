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
      onStart={async () => {
        // Make the DB no longer hidden
        await updateDatabase({ id: nextDatabaseId, name: null, isHidden: false })

        // Navigate to this DB's path
        router.push(`/db/${nextDatabaseId}`)

        // Pre-load the next DB
        const nextId = uniqueId()
        localStorage.setItem('next-db-id', JSON.stringify(nextId))
        preloadDb(nextId)
      }}
    />
  )
}

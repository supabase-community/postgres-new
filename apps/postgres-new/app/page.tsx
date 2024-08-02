'use client'

import { customAlphabet } from 'nanoid'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import Workspace from '~/components/workspace'
import { useDatabaseCreateMutation } from '~/data/databases/database-create-mutation'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { getDb } from '~/lib/db'
import { useLocalStorage } from '~/lib/hooks'

export const dynamic = 'force-static'

// Use a DNS safe alphabet
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

function uniqueId() {
  return nanoid()
}

export default function Page() {
  const router = useRouter()

  const { mutateAsync: createDatabase } = useDatabaseCreateMutation()
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  /**
   * Preloads next empty database so that it is ready immediately.
   */
  const preloadDb = useCallback(
    async (id: string) => {
      await createDatabase({ id, isHidden: true })
      await getDb(id)
    },
    [createDatabase]
  )

  // Track the next database ID in local storage
  const [nextDatabaseId] = useLocalStorage('next-db-id', uniqueId())

  // The very first DB needs to be loaded on mount
  useEffect(() => {
    preloadDb(nextDatabaseId)
  }, [nextDatabaseId, preloadDb])

  return (
    <Workspace
      databaseId={nextDatabaseId}
      onStart={async () => {
        // Make the DB no longer hidden
        await updateDatabase({ id: nextDatabaseId, name: null, isHidden: false })

        // Navigate to this DB's path
        router.push(`/db/${nextDatabaseId}`)

        // Pre-load the next DB (but without causing a re-render)
        const nextId = uniqueId()
        localStorage.setItem('next-db-id', JSON.stringify(nextId))
        preloadDb(nextId)
      }}
    />
  )
}

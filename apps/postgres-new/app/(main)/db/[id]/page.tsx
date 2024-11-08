'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import Workspace from '~/components/workspace'
import { useDatabaseLock } from '~/lib/database-locks'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id
  const router = useRouter()
  const { dbManager } = useApp()

  useEffect(() => {
    async function run() {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      try {
        await dbManager.getDbInstance(databaseId)
      } catch (err) {
        router.push('/')
      }
    }
    run()
  }, [dbManager, databaseId, router])

  const isLocked = useDatabaseLock(databaseId)

  if (isLocked) {
    return <div>Database is locked</div>
  }

  return <Workspace databaseId={databaseId} visibility="local" />
}

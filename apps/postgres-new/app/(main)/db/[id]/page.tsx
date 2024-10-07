'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import Workspace from '~/components/workspace'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id
  const router = useRouter()
  const { dbManager, liveShare } = useApp()

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

  // Cleanup live shared database when switching databases
  useEffect(() => {
    if (liveShare.isLiveSharing && liveShare.databaseId !== databaseId) {
      liveShare.stop()
    }
  }, [liveShare, databaseId])

  return <Workspace databaseId={databaseId} visibility="local" />
}

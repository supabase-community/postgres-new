'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import Workspace from '~/components/workspace'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id
  const router = useRouter()
  const { dbManager, connectedDatabase } = useApp()

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

  // Cleanup connected database when switching databases
  useEffect(() => {
    if (connectedDatabase.isConnected && connectedDatabase.databaseId !== databaseId) {
      connectedDatabase.disconnect()
    }
  }, [connectedDatabase, databaseId])

  return <Workspace databaseId={databaseId} visibility="local" />
}

'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useApp } from '~/components/app-provider'
import Workspace from '~/components/workspace'

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
        await dbManager.closeDbInstance(databaseId)
      } catch (err) {
        router.push('/')
      }
    }
    run()
  }, [dbManager, databaseId, router])

  return (
    <ErrorBoundary fallback={<div>Error fallback</div>}>
      <Suspense fallback={<div>Suspense fallback</div>}>
        <Workspace databaseId={databaseId} visibility="local" />
      </Suspense>
    </ErrorBoundary>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import Workspace from '~/components/workspace'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id
  const router = useRouter()

  useEffect(() => {
    async function run() {
      const { getDb } = await import('~/lib/db')
      try {
        await getDb(databaseId)
      } catch (err) {
        router.push('/')
      }
    }
    run()
  }, [databaseId, router])

  return (
    <ErrorBoundary fallback={<div>Error fallback</div>}>
      <Suspense fallback={<div>Suspense fallback</div>}>
        <Workspace databaseId={databaseId} visibility="local" />
      </Suspense>
    </ErrorBoundary>
  )
}

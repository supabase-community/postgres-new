'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import { useAcquireLock, useIsLocked } from '~/components/lock-provider'
import Workspace from '~/components/workspace'
import NewDatabasePage from '../../page'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id

  const router = useRouter()
  const { dbManager } = useApp()
  useAcquireLock(databaseId)
  const isLocked = useIsLocked(databaseId, true)

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

  if (isLocked) {
    return (
      <div className="relative h-full w-full">
        <NewDatabasePage />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center m-4">
          <p>
            This database is already open in another tab or window.
            <br />
            <br />
            Due to{' '}
            <Link
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              href="https://github.com/electric-sql/pglite?tab=readme-ov-file#how-it-works"
            >
              PGlite&apos;s single-user mode limitation
            </Link>
            , only one connection is allowed at a time.
            <br />
            <br />
            Please close the database in the other location to access it here.
          </p>
        </div>
      </div>
    )
  }

  return <Workspace databaseId={databaseId} visibility="local" />
}

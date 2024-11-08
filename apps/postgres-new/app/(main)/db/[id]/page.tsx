/* eslint-disable react/no-unescaped-entities */
'use client'

import NewDatabasePage from '../../page'
import Link from 'next/link'
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
    return (
      <div className="relative h-full w-full">
        <NewDatabasePage />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <p>
            This database is already open in another tab or window.
            <br />
            <br />
            Due to{' '}
            <Link
              target="_blank"
              className="underline"
              href="https://github.com/electric-sql/pglite?tab=readme-ov-file#how-it-works"
            >
              PGlite's single-user mode limitation
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

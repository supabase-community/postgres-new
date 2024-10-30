'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import { DeployFailureDialog } from '~/components/deploy/deploy-failure-dialog'
import { DeploySuccessDialog } from '~/components/deploy/deploy-success-dialog'
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
        await dbManager.getDbInstance(databaseId)
      } catch (err) {
        router.push('/')
      }
    }
    run()
  }, [dbManager, databaseId, router])

  return (
    <>
      <DeploySuccessDialog />
      <DeployFailureDialog />
      <Workspace databaseId={databaseId} visibility="local" />
    </>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

export default function Page({ params }: { params: { databaseId: string } }) {
  const databaseId = params.databaseId
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

      // make the database available to the deployment worker
      const databaseUrl = await liveShare.start(databaseId)

      // trigger deployment
    }
    run()
    return () => {
      liveShare.stop()
    }
  }, [dbManager, databaseId, router, liveShare])

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Deploying your database</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div>
          <p>Your database is being deployed. Please do not close this page.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

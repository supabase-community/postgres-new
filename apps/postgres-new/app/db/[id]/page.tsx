'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Workspace from '~/components/workspace'
import { getDb } from '~/lib/db'

export default function Page({ params }: { params: { id: string } }) {
  const databaseId = params.id
  const router = useRouter()

  useEffect(() => {
    async function run() {
      try {
        await getDb(databaseId)
      } catch (err) {
        router.push('/')
      }
    }
    run()
  }, [databaseId, router])

  return <Workspace databaseId={databaseId} visibility="local" />
}

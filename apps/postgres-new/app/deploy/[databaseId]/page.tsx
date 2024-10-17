'use client'

import { useMutation } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useApp } from '~/components/app-provider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { createClient } from '~/utils/supabase/client'

export default function Page() {
  const params = useParams<{ databaseId: string }>()
  const searchParams = useSearchParams()
  const { liveShare } = useApp()
  const [databaseUrl, setDatabaseUrl] = useState<string | undefined>()
  const { mutate: deploy, error } = useMutation({
    mutationFn: async () => {
      // make the database available to the deployment worker
      const localDatabaseUrl = await liveShare.start(params.databaseId)

      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('You must be signed in to deploy')
      }

      // trigger the deployment
      const response = await fetch(process.env.NEXT_PUBLIC_DEPLOY_WORKER_DOMAIN!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Refresh-Token': session.refresh_token,
        },
        body: JSON.stringify({
          databaseId: params.databaseId,
          databaseUrl: localDatabaseUrl,
          integrationId: parseInt(searchParams.get('integration')!),
        }),
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      return (await response.json()) as {
        databaseUrl: string
      }
    },
    onSuccess(data) {
      setDatabaseUrl(data.databaseUrl)
    },
    onError(error) {
      console.error(error)
    },
    onSettled() {
      console.log('stopping live share')
      liveShare.stop()
    },
  })
  useEffect(() => {
    deploy()
  }, [deploy])

  const text = error
    ? { title: 'Database deployment failed', content: error.message }
    : databaseUrl
      ? {
          title: 'Database deployed',
          content: 'Your database is deployed at the following URL:',
          url: databaseUrl,
        }
      : {
          title: 'Deploying your database',
          content: 'Your database is being deployed. Please do not close this page.',
        }

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div>
          <p>{text.content}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useMutation } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '~/components/app-provider'
import { createClient } from '~/utils/supabase/client'
import { Loader2 } from 'lucide-react'
import { getOauthUrl } from '~/lib/util'
import { SupabaseIcon } from '~/components/supabase-icon'
import LineAnimation from '~/components/lines'

class IntegrationRevokedError extends Error {
  constructor() {
    super('The integration is no longer active. Please re-authorize the integration.')
    this.name = 'IntegrationRevokedError'
  }
}

export default function Page() {
  const params = useParams<{ databaseId: string }>()
  const router = useRouter()
  const { liveShare } = useApp()
  const searchParams = useSearchParams()

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
        if (response.status === 406) {
          throw new IntegrationRevokedError()
        } else {
          throw new Error(await response.text())
        }
      }

      return (await response.json()) as {
        project: {
          name: string
          url: string
          databasePassword: string | undefined
          databaseUrl: string
          poolerUrl: string
        }
      }
    },
    onSuccess(data) {
      const searchParams = new URLSearchParams({
        event: 'deploy.success',
        project: JSON.stringify(data.project),
      })
      const url = new URL(
        `/db/${params.databaseId}?${searchParams.toString()}`,
        window.location.href
      )
      router.push(url.toString())
    },
    onError(error) {
      if (error instanceof IntegrationRevokedError) {
        router.push(getOauthUrl({ databaseId: params.databaseId }))
        return
      }

      const searchParams = new URLSearchParams({
        event: 'deploy.failure',
        error: error.message,
      })
      const url = new URL(
        `/db/${params.databaseId}?${searchParams.toString()}`,
        window.location.href
      )
      router.push(url.toString())
    },
    onSettled() {
      liveShare.stop()
    },
  })
  useEffect(() => {
    deploy()
  }, [deploy])

  return (
    <div className="flex items-center justify-center h-full w-full bg-muted">
      <div className="w-full h-full max-h-[400px] border border rounded-lg overflow-hidden relative flex justify-center items-center">
        <div className="bg-background border rounded-md relative z-10 max-w-full">
          <h1 className="flex gap-2 items-center border-b px-6 py-4 font-semibold">
            <SupabaseIcon />
            Deploying your database
          </h1>
          <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
              <Loader2 className="animate-spin" />
              <div>
                <p>Your database is being deployed. This process typically takes a few minutes.</p>
                <p>Please keep this page open to ensure successful deployment.</p>
              </div>
            </div>
          </div>
        </div>
        <LineAnimation />
      </div>
    </div>
  )
}

'use client'

import { Dialog, DialogContent, DialogTitle, DialogHeader } from './ui/dialog'
import { useRouter } from 'next/navigation'
import { CopyableField } from './copyable-field'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from './ui/badge'

export function DeploySuccessDialog() {
  const router = useRouter()
  const [project, setProject] = useState<{
    name: string
    url: string
    databasePassword: string | undefined
    databaseUrl: string
    poolerUrl: string
  } | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    if (searchParams.get('event') === 'deploy.success') {
      setProject(JSON.parse(searchParams.get('project')!))
      setOpen(true)
      router.replace(window.location.pathname)
    }
  }, [router])

  if (!project) {
    return null
  }

  const deployText = project.databasePassword ? 'deployed' : 'redeployed'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Database {deployText}</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div className="flex flex-col gap-8">
          <p>
            Database {deployText} to the Supabase project{' '}
            <Link
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
              href={project.url}
            >
              {project.name}
            </Link>
          </p>
          <p className="flex flex-col gap-4">
            <CopyableField
              label={
                <>
                  Database Connection URL <Badge variant="secondary">IPv6</Badge>
                </>
              }
              value={project.databaseUrl}
            />
            <CopyableField
              label={
                <>
                  Pooler Connection URL{' '}
                  <span className="inline-flex gap-1">
                    <Badge variant="secondary">IPv4</Badge>
                    <Badge variant="secondary">IPv6</Badge>
                  </span>
                </>
              }
              value={project.poolerUrl}
            />
            {project.databasePassword ? (
              <>
                <CopyableField label="Database Password" value={project.databasePassword} />
                <span className="text-muted-foreground text-sm font-semibold">
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  Important: Please save your database password securely as it won't be displayed
                  again.
                </span>
              </>
            ) : null}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

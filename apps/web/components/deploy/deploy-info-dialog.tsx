'use client'

import { getDatabaseUrl, getPoolerUrl } from '@database.build/deploy/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { DeployedDatabase } from '~/data/deployed-databases/deployed-databases-query'
import { SupabaseIcon } from '../supabase-icon'
import { Button } from '../ui/button'
import { SupabaseDeployInfo, SupabaseDeploymentInfo } from './deploy-info'

type SupabaseProject = {
  id: string
  name: string
  pooler: {
    host: string
    name: string
    port: number
    user: string
  }
  region: string
  database: {
    host: string
    name: string
    port: number
    user: string
  }
  createdAt: string
  organizationId: string
}

export type DeployInfoDialogProps = {
  deployedDatabase: DeployedDatabase
  open: boolean
  onOpenChange: (open: boolean) => void
  onRedeploy: () => void
}

export function DeployInfoDialog({
  deployedDatabase,
  open,
  onOpenChange,
  onRedeploy,
}: DeployInfoDialogProps) {
  const { project } = deployedDatabase.provider_metadata as { project: SupabaseProject }

  const projectUrl = `${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL}/dashboard/project/${project.id}`
  const databaseUrl = getDatabaseUrl({ project })
  const poolerUrl = getPoolerUrl({ project })

  const deployInfo: SupabaseDeploymentInfo = {
    name: project.name,
    url: projectUrl,
    databaseUrl,
    poolerUrl,
    createdAt: deployedDatabase.last_deployment_at
      ? new Date(deployedDatabase.last_deployment_at)
      : undefined,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center mb-4">
            <SupabaseIcon />
            Database deployed to Supabase
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-4">
            <SupabaseDeployInfo info={deployInfo} />
            <div className="my-1 border-b" />
            <div className="flex flex-col gap-4">
              <p>
                If you wish to redeploy your latest in-browser database to Supabase, click{' '}
                <strong>Redeploy</strong>.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onRedeploy()
                }}
              >
                Redeploy
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

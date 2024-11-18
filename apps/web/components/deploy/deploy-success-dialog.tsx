'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { SupabaseDeployInfo, SupabaseDeploymentInfo } from './deploy-info'

export type DeploySuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deployInfo: SupabaseDeploymentInfo
}

export function DeploySuccessDialog({ open, onOpenChange, deployInfo }: DeploySuccessDialogProps) {
  const isRedeploy = !deployInfo.databasePassword
  const deployText = isRedeploy ? 'redeployed' : 'deployed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Database {deployText}</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div className="flex flex-col gap-8">
          <SupabaseDeployInfo info={deployInfo} isRedeploy={isRedeploy} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

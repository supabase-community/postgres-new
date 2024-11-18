'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { SupabaseIcon } from '../supabase-icon'

export type DeployFailureDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorMessage: string
}

export function DeployFailureDialog({
  open,
  onOpenChange,
  errorMessage,
}: DeployFailureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <SupabaseIcon />
            Database deployment failed
          </DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <p>{errorMessage}</p>
      </DialogContent>
    </Dialog>
  )
}

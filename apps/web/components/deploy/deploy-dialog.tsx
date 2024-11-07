'use client'

import { DialogProps } from '@radix-ui/react-dialog'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

export type DeployDialogProps = DialogProps & {
  onConfirm?: () => void
}

export function DeployDialog({ onConfirm, ...props }: DeployDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Deploy to Supabase</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <Button onClick={onConfirm}>Deploy</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

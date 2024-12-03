'use client'

import { DialogProps } from '@radix-ui/react-dialog'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { SupabaseIcon } from '../supabase-icon'

export type IntegrationDialogProps = DialogProps & {
  onConfirm?: () => void
}

export function IntegrationDialog({ onConfirm, ...props }: IntegrationDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <SupabaseIcon />
            Connect Supabase
          </DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <p>
            To deploy your database, you need to connect your Supabase account. If you don&apos;t
            already have a Supabase account, you can create one for free.
          </p>
          <p>
            Click <strong>Connect</strong> to connect your account.
          </p>
          <Button onClick={onConfirm}>Connect</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

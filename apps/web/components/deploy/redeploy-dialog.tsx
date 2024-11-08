import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Database } from '~/lib/db'
import { Button } from '../ui/button'

export type RedeployDialogProps = {
  database: Database
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

export function RedeployDialog({
  database,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: RedeployDialogProps) {
  const [confirmedValue, setConfirmedValue] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="mb-4">Confirm redeploy of {database.name}</DialogTitle>
          <DialogDescription className="flex flex-col gap-4">
            <div className="flex gap-2 items-center rounded-md border-destructive bg-destructive/25 p-2">
              <TriangleAlert size={16} />
              This action cannot be undone.
            </div>
            <p>
              Redeploying will completely overwrite the existing deployed database with the latest
              version of your browser database. Existing schema and data in the deployed database
              will be lost.
            </p>
            <div className="my-1 border-b" />
            <div className="flex flex-col gap-3">
              <p>
                Type <strong>{database.name}</strong> to confirm.
              </p>
              <Input
                className="placeholder:text-primary/25"
                placeholder="Type the database name here"
                value={confirmedValue}
                onChange={(e) => setConfirmedValue(e.target.value)}
              />
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-1">
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false)
              onCancel()
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-destructive text-primary hover:text-secondary"
            onClick={() => {
              onConfirm()
            }}
            disabled={confirmedValue !== database.name}
          >
            I understand, overwrite the database
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

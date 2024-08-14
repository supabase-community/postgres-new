import { DeployedDatabaseFields } from '~/components/deployed-database-fields'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog'
import { Database } from '~/data/databases/database-type'
import { DeployedDatabaseCreateResult } from '~/data/deployed-databases/deployed-database-create-mutation'

export type DatabaseDeployedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  database: Database
} & DeployedDatabaseCreateResult

export function DatabaseDeployedDialog(props: DatabaseDeployedDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Database {props.database.name} deployed</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your database has been deployed to a serverless{' '}
            <a
              className="underline font-bold"
              href="https://pglite.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              PGlite
            </a>{' '}
            instance so that it can be accessed outside the browser using any Postgres client.
          </p>
          <DeployedDatabaseFields {...props} />
          {props.password && (
            <div className="flex justify-center pt-2">
              <p className="text-sm text-muted-foreground">
                Please{' '}
                <span className="font-bold text-destructive-foreground">save your password</span>,
                it will not be shown again!
              </p>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

import { Loader, LoaderIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DeployedDatabaseFields,
  DeployedDatabaseFieldsProps,
} from '~/components/deployed-database-fields'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import type { Database } from '~/data/databases/database-type'
import { useDeployedDatabaseResetPasswordMutation } from '~/data/deployed-databases/deployed-database-reset-password-mutation'

type DeployedDatabaseDialogProps = {
  database: Database
  children: React.ReactNode
}

export function DeployedDatabaseDialog(props: DeployedDatabaseDialogProps) {
  const [password, setPassword] = useState<string | undefined>()
  const { mutateAsync: resetDatabasePassword, isPending: isResettingDatabasePassword } =
    useDeployedDatabaseResetPasswordMutation()

  // TODO: maybe store these infos as part of the Database type
  const fields: DeployedDatabaseFieldsProps = {
    username: 'readonly_postgres',
    databaseName: 'postgres',
    host: `${props.database.id}.${process.env.NEXT_PUBLIC_WILDCARD_DOMAIN}`,
    port: 5432,
    password,
  }

  async function handleResetPassword() {
    const result = await resetDatabasePassword({ databaseId: props.database.id })
    setPassword(result.password)
  }

  return (
    <Dialog>
      <DialogTrigger>{props.children}</DialogTrigger>
      <DialogPortal>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Database {props.database.name}</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your database is deployed to a serverless{' '}
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
          <DeployedDatabaseFields {...fields} />
          <div className="flex justify-center pt-2">
            {password ? (
              <p className="text-sm text-muted-foreground">
                Please{' '}
                <span className="font-bold text-destructive-foreground">save your password</span>,
                it will not be shown again!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground flex place-items-center">
                <span className="mr-2">Forgot your database password?</span>
                <Button
                  className="text-foreground h-6"
                  variant="outline"
                  onClick={handleResetPassword}
                  size="sm"
                >
                  {isResettingDatabasePassword ? (
                    <Loader
                      className="mr-1 animate-spin flex-shrink-0 text-muted-foreground"
                      size={12}
                      strokeWidth={2}
                    />
                  ) : (
                    <RefreshCwIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                  )}
                  Generate a new password
                </Button>
              </p>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

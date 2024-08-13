import {
  DeployedDatabaseFields,
  DeployedDatabaseFieldsProps,
} from '~/components/deployed-database-fields'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Database } from '~/data/databases/database-type'

type DeployedDatabaseDialogProps = {
  database: Database
  children: React.ReactNode
}

export function DeployedDatabaseDialog(props: DeployedDatabaseDialogProps) {
  // TODO: maybe store these infos as part of the Database type
  const fields: DeployedDatabaseFieldsProps = {
    username: 'readonly_postgres',
    databaseName: 'postgres',
    host: `${props.database.id}.${process.env.NEXT_PUBLIC_WILDCARD_DOMAIN}`,
    port: 5432,
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
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

import { Loader, Upload } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '~/components/app-provider'
import { CodeBlock } from '~/components/code-block'
import { DeployedDatabaseFields } from '~/components/deployed-database-fields'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Database } from '~/data/databases/database-type'
import {
  DeployedDatabaseCreateResult,
  useDeployedDatabaseCreateMutation,
} from '~/data/deployed-databases/deployed-database-create-mutation'
import { LocalDatabase } from '~/lib/db'

export type DatabaseItemDeployActionProps = {
  database: Database
  onDialogOpenChange: (isOpen: boolean) => void
}

export function DatabaseItemDeployAction(props: DatabaseItemDeployActionProps) {
  const [deployResult, setDeployResult] = useState<DeployedDatabaseCreateResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <DatabaseItemDeployActionMenuItem
        database={props.database}
        onDeploySuccess={(data) => {
          setDeployResult(data)
          setIsDialogOpen(true)
          props.onDialogOpenChange(true)
        }}
      />
      {deployResult && (
        <DatabaseItemDeployActionDialog
          open={isDialogOpen}
          onOpenChange={props.onDialogOpenChange}
          database={props.database}
          {...deployResult}
        />
      )}
    </>
  )
}

type DatabaseItemDeployActionMenuItemProps = {
  database: Database
  onDeploySuccess: (data: DeployedDatabaseCreateResult) => void
}

function DatabaseItemDeployActionMenuItem(props: DatabaseItemDeployActionMenuItemProps) {
  const { user } = useApp()
  const { mutateAsync: deployDatabase, isPending: isDeploying } =
    useDeployedDatabaseCreateMutation()

  async function handleMenuItemSelect(e: Event) {
    e.preventDefault()

    const deploymentResult = await deployDatabase({
      databaseId: props.database.id,
      createdAt: props.database.createdAt,
      name: props.database.name,
    })

    props.onDeploySuccess(deploymentResult)
  }

  return (
    <DropdownMenuItem
      className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
      disabled={user === undefined}
      onSelect={handleMenuItemSelect}
    >
      {isDeploying ? (
        <Loader
          className="animate-spin flex-shrink-0 text-muted-foreground"
          size={16}
          strokeWidth={2}
        />
      ) : (
        <Upload size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      )}

      <span>Deploy</span>
    </DropdownMenuItem>
  )
}

type DatabaseItemDeployActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  database: Database
} & DeployedDatabaseCreateResult

function DatabaseItemDeployActionDialog(props: DatabaseItemDeployActionDialogProps) {
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
            instance so that it can be accessed outside the browser using any Postgres client:
          </p>
          <DeployedDatabaseFields {...props} />
          {props.password && (
            <p className="text-sm text-muted-foreground">
              Please{' '}
              <span className="font-bold text-destructive-foreground">save your password</span>, it
              will not be shown again!
            </p>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

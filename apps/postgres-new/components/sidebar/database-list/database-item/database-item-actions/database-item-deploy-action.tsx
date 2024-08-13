import { Loader, Upload } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '~/components/app-provider'
import { CodeBlock } from '~/components/code-block'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import {
  DeployedDatabaseCreateResult,
  useDeployedDatabaseCreateMutation,
} from '~/data/deployed-databases/deployed-database-create-mutation'
import { LocalDatabase } from '~/lib/db'

export type DatabaseItemDeployActionProps = {
  database: LocalDatabase
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
          {...deployResult}
        />
      )}
    </>
  )
}

type DatabaseItemDeployActionMenuItemProps = {
  database: LocalDatabase
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
} & DeployedDatabaseCreateResult

function DatabaseItemDeployActionDialog(props: DatabaseItemDeployActionDialogProps) {
  const { username, password, serverName } = props
  const psqlCommand = `psql "postgres://${username}:${encodeURIComponent(password)}@${serverName}/postgres"`

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your database has been deployed</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <h2 className="font-bold">What are deployments?</h2>
          <p>
            Your database has been deployed to a serverless PGlite instance so that it can be
            accessed outside the browser using any Postgres client:
          </p>
          <CodeBlock
            className="language-curl bg-neutral-800"
            language="curl"
            hideLineNumbers
            theme="dark"
            value={psqlCommand}
          >
            {psqlCommand}
          </CodeBlock>
          <p>Please write down your password, it will not be shown again.</p>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

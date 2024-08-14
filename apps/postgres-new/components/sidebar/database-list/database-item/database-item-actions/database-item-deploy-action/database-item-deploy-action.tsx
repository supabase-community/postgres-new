import { Loader, Upload } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '~/components/app-provider'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Database } from '~/data/databases/database-type'
import {
  DeployedDatabaseCreateResult,
  useDeployedDatabaseCreateMutation,
} from '~/data/deployed-databases/deployed-database-create-mutation'
import { DatabaseDeployedDialog } from './database-deployed-dialog'

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
        <DatabaseDeployedDialog
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

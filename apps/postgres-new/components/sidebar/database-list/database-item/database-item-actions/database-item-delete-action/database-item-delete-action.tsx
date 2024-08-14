import { Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Database } from '~/data/databases/database-type'
import { ConfirmDatabaseDeleteAlert } from './confirm-database-delete-alert'

export type DatabaseItemDeleteActionProps = {
  database: Database
  isActive: boolean
  onDialogOpenChange: (isOpen: boolean) => void
}

export function DatabaseItemDeleteAction(props: DatabaseItemDeleteActionProps) {
  return (
    <ConfirmDatabaseDeleteAlert
      database={props.database}
      isActive={props.isActive}
      onOpenChange={props.onDialogOpenChange}
    >
      <DropdownMenuItem
        className="gap-3"
        onSelect={(e) => {
          e.preventDefault()
        }}
      >
        <Trash2 size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
        <span>Delete</span>
      </DropdownMenuItem>
    </ConfirmDatabaseDeleteAlert>
  )
}

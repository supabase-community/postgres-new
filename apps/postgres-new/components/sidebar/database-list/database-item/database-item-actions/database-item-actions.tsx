import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { cn } from '~/lib/utils'
import { DatabaseItemRenameAction, RenameDatabaseForm } from './database-item-rename-action'
import { useState } from 'react'
import { LocalDatabase } from '~/lib/db'
import { DatabaseItemDownloadAction } from './database-item-download-action'
import { DatabaseItemDeployAction } from './database-item-deploy-action'
import { DatabaseItemDeleteAction } from './database-item-delete-action'
import { Button } from '~/components/ui/button'

export type DatabaseItemActionsProps = {
  database: LocalDatabase
  isActive: boolean
}

export function DatabaseItemActions(props: DatabaseItemActionsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [hasOpenDialog, setHasOpenDialog] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  function handleDialogOpenChange(open: boolean) {
    setHasOpenDialog(open)
    if (open === false) {
      setIsDropdownOpen(false)
    }
  }

  return (
    <DropdownMenu modal={false} open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger className="group/trigger outline-none" asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical
            size={16}
            className={cn(
              props.isActive
                ? 'text-muted-foreground'
                : 'text-transparent group-hover:text-muted-foreground focus-visible:text-muted-foreground group-focus/trigger:text-muted-foreground',
              'group-data-[state=open]/trigger:text-foreground',
              'transition'
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start" hidden={hasOpenDialog}>
        {isRenaming ? (
          <RenameDatabaseForm
            database={props.database}
            onSuccess={() => {
              setIsDropdownOpen(false)
              setIsRenaming(false)
            }}
          />
        ) : (
          <div className="flex flex-col items-stretch w-32">
            <DatabaseItemRenameAction
              database={props.database}
              onSelect={(e) => {
                e.preventDefault()
                setIsRenaming(true)
              }}
            />
            <DatabaseItemDownloadAction database={props.database} />
            <DatabaseItemDeployAction
              database={props.database}
              onDialogOpenChange={handleDialogOpenChange}
            />
            <DropdownMenuSeparator />
            <DatabaseItemDeleteAction database={props.database} isActive={props.isActive} />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

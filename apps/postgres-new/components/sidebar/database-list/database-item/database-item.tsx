import type { Database } from '~/data/databases/database-type'
import Link from 'next/link'
import { cn } from '~/lib/utils'
import { DatabaseItemActions } from './database-item-actions/database-item-actions'
import { CloudIcon } from 'lucide-react'
import { DeployedDatabaseDialog } from './deployed-database-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Button } from '~/components/ui/button'

type DatabaseItemProps = {
  database: Database
  isActive: boolean
}

export function DatabaseItem(props: DatabaseItemProps) {
  const databaseName = props.database.name ?? 'My database'

  return (
    <div
      data-active={props.isActive}
      className={cn(
        'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
      )}
    >
      {props.database.deployment ? (
        <DeployedDatabaseDialog database={props.database}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <CloudIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Database deployed</span>
            </TooltipContent>
          </Tooltip>
        </DeployedDatabaseDialog>
      ) : (
        <div className="w-10 h-10 flex-shrink-0" />
      )}
      <Link
        className="flex w-full h-10 items-center overflow-hidden"
        href={`/db/${props.database.id}`}
      >
        <span className="text-nowrap grow truncate">{databaseName}</span>
      </Link>
      <div>
        <DatabaseItemActions database={props.database} isActive={props.isActive} />
      </div>
    </div>
  )
}

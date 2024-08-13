import type { Database } from '~/data/databases/database-type'
import Link from 'next/link'
import { cn } from '~/lib/utils'
import { DatabaseItemActions } from './database-item-actions/database-item-actions'
import { CloudIcon } from 'lucide-react'
import { DatabaseItemDeployedDialog } from './deployed-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Button } from '~/components/ui/button'

type DatabaseItemProps = {
  database: Database
  isActive: boolean
}

export function DatabaseItem(props: DatabaseItemProps) {
  const databaseName = props.database.name ?? 'My database'

  return (
    <Link
      data-active={props.isActive}
      className={cn(
        'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
      )}
      href={`/db/${props.database.id}`}
    >
      {props.database.deployment ? (
        <DatabaseItemDeployedDialog databaseUrl={props.database.deployment.url}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <CloudIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>Database deployed</span>
            </TooltipContent>
          </Tooltip>
        </DatabaseItemDeployedDialog>
      ) : (
        <div className="w-10 h-10" />
      )}
      <span className="text-nowrap grow truncate">{databaseName}</span>
      <DatabaseItemActions database={props.database} isActive={props.isActive} />
    </Link>
  )
}

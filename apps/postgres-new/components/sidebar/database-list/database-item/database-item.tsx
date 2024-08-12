import type { Database } from '~/lib/db'
import Link from 'next/link'
import { cn } from '~/lib/utils'
import { DatabaseItemActions } from './database-item-actions/database-item-actions'

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
        'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 px-3 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
      )}
      href={`/db/${props.database.id}`}
    >
      <span className="text-nowrap grow truncate">{databaseName}</span>
      <DatabaseItemActions database={props.database} isActive={props.isActive} />
    </Link>
  )
}

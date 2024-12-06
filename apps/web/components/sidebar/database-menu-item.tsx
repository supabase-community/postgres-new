import { TooltipPortal } from '@radix-ui/react-tooltip'
import { RadioIcon } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '~/components/app-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import type { MergedDatabase } from '~/data/merged-databases/merged-database'
import { cn } from '~/lib/utils'

export type DatabaseMenuItemProps = {
  database: MergedDatabase
  isActive: boolean
  onClick?: () => void
}

export function DatabaseMenuItem({ database, isActive, onClick }: DatabaseMenuItemProps) {
  const { liveShare } = useApp()

  return (
    <Link
      data-active={isActive}
      className={cn(
        'group text-nowrap grow truncate text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 px-3 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
      )}
      href={`/db/${database.id}`}
      onClick={onClick}
    >
      {liveShare.isLiveSharing && liveShare.databaseId === database.id && (
        <Tooltip>
          <TooltipTrigger asChild>
            <RadioIcon size={18} />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom">
              <p>Shared</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      )}
      {database.name ?? 'My database'}
    </Link>
  )
}

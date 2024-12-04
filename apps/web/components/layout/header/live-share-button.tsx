import { useApp } from '~/components/app-provider'
import { LiveShareIcon } from '~/components/live-share-icon'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Database } from '~/lib/db'
import { cn } from '~/lib/utils'

export function LiveShareButton(props: { database: Database }) {
  const { liveShare, user } = useApp()

  const handleClick = () => {
    if (!user) return
    liveShare.start(props.database.id)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className={cn('relative', !user && 'opacity-50 cursor-default')}
        >
          {liveShare.isLiveSharing && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />
          )}
          <LiveShareIcon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!user
          ? 'Sign in to use Live Share'
          : liveShare.isLiveSharing
            ? 'Stop Live Share'
            : 'Start Live Share'}
      </TooltipContent>
    </Tooltip>
  )
}

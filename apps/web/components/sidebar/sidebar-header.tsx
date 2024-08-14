import { m } from 'framer-motion'
import { ArrowLeftToLine, ArrowRightToLine, PackagePlus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useApp } from '~/components/app-provider'
import { useRouter } from 'next/navigation'
import { SignInDialog } from '~/components/sign-in-dialog'

export type SidebarHeaderProps = {
  onCollapse: () => void
}

export function SidebarHeader(props: SidebarHeaderProps) {
  const { focusRef, user } = useApp()
  const router = useRouter()

  return (
    <div className="flex justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div layout="position" layoutId="sidebar-collapse">
            <Button
              variant={'ghost'}
              size={'icon'}
              onClick={() => {
                props.onCollapse()
              }}
            >
              <ArrowLeftToLine size={14} />
            </Button>
          </m.div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Close sidebar</p>
        </TooltipContent>
      </Tooltip>
      <m.div layout="position" layoutId="new-database-button">
        <SignInDialog>
          <Button
            onClick={(e) => {
              if (user) {
                e.preventDefault()
                router.push('/')
                focusRef.current?.focus()
              }
            }}
            className="gap-2"
          >
            <PackagePlus size={14} />
            New database
          </Button>
        </SignInDialog>
      </m.div>
    </div>
  )
}

export type CollapsedSidebarHeaderProps = {
  onExpand: () => void
}

export function CollapsedSidebarHeader(props: CollapsedSidebarHeaderProps) {
  const { focusRef, user } = useApp()
  const router = useRouter()

  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div layout="position" layoutId="sidebar-collapse">
            <Button
              variant={'ghost'}
              size="icon"
              onClick={() => {
                props.onExpand()
              }}
            >
              <ArrowRightToLine size={14} />
            </Button>
          </m.div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Open sidebar</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div layout="position" layoutId="new-database-button">
            <SignInDialog>
              <Button
                size={'icon'}
                onClick={(e) => {
                  if (user) {
                    e.preventDefault()
                    router.push('/')
                    focusRef.current?.focus()
                  }
                }}
              >
                <PackagePlus size={14} />
              </Button>
            </SignInDialog>
          </m.div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>New database</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

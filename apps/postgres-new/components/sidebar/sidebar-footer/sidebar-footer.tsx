import { m } from 'framer-motion'
import ThemeDropdown from './theme-dropdown'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'
import { LogOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export type SidebarFooterProps = {}

export function SidebarFooter(props: SidebarFooterProps) {
  const { user, signOut } = useApp()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <>
      <m.div layout="position" layoutId="theme-dropdown">
        <ThemeDropdown className="w-full" />
      </m.div>
      {user && (
        <m.div layout="position" layoutId="sign-out-button">
          <Button className="w-full gap-2" variant="secondary" onClick={handleSignOut}>
            <LogOut size={18} strokeWidth={2} />
            Sign out
          </Button>
        </m.div>
      )}
    </>
  )
}

export type CollapsedSidebarFooterProps = {}

export function CollapsedSidebparFooter(props: CollapsedSidebarFooterProps) {
  const { user, signOut } = useApp()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div layout="position" layoutId="theme-dropdown">
            <ThemeDropdown iconOnly />
          </m.div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Toggle theme</p>
        </TooltipContent>
      </Tooltip>
      {user && (
        <Tooltip>
          <TooltipTrigger asChild>
            <m.div layout="position" layoutId="sign-out-button">
              <Button size={'icon'} variant="secondary" onClick={handleSignOut}>
                <LogOut size={16} strokeWidth={2} />
              </Button>
            </m.div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Sign out</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

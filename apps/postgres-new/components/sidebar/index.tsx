'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Database as DbIcon,
  Loader,
  LogOut,
  Menu,
  PackagePlus,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useApp } from '~/components/app-provider'
import ThemeDropdown from '~/components/theme-dropdown'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useMergedDatabases } from '~/data/merged-databases/merged-databases'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { cn } from '~/lib/utils'
import { DatabaseMenuItem } from './database-menu-item'
import { SignInDialog } from './sign-in-dialog'

export default function Sidebar() {
  const {
    user,
    signOut,
    focusRef,
    isSignInDialogOpen,
    setIsSignInDialogOpen,
    setIsRenameDialogOpen,
    isLegacyDomain,
    liveShare,
  } = useApp()
  let { id: currentDatabaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const isSmallBreakpoint = useBreakpoint('lg')
  const [showSidebar, setShowSidebar] = useState(!isSmallBreakpoint)

  useEffect(() => {
    if (isSmallBreakpoint) {
      setShowSidebar(false)
    }
  }, [isSmallBreakpoint])

  const { data: databases, isLoading: isLoadingDatabases } = useMergedDatabases()

  return (
    <>
      <SignInDialog open={isSignInDialogOpen} onOpenChange={setIsSignInDialogOpen} />

      {/* Main sidebar */}
      <AnimatePresence initial={false} mode="popLayout">
        {showSidebar && (
          <m.div
            className="max-w-72 w-full h-full flex flex-col gap-2 items-stretch p-4 bg-card absolute top-0 bottom-0 left-0 z-20 lg:static"
            variants={{
              hidden: { opacity: 0, x: '-100%' },
              show: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.25 }}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0 } }}
          >
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <m.div layout="position" layoutId="sidebar-collapse">
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      onClick={() => {
                        setShowSidebar(false)
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
                <Button
                  onClick={() => {
                    if (!user) {
                      setIsSignInDialogOpen(true)
                    } else {
                      if (liveShare.isLiveSharing) {
                        liveShare.stop()
                      }
                      router.push('/')
                      focusRef.current?.focus()
                    }
                    if (isSmallBreakpoint) {
                      setShowSidebar(false)
                    }
                  }}
                  className="gap-2"
                >
                  <PackagePlus size={14} />
                  New database
                </Button>
              </m.div>
            </div>
            {databases && databases.length > 0 ? (
              <m.div
                className="flex-1 flex flex-col items-stretch overflow-y-auto overflow-x-hidden"
                transition={{ staggerChildren: 0.03 }}
                initial="hidden"
                animate="show"
              >
                {databases.map((database) => (
                  <m.div
                    key={database.id}
                    layout="position"
                    layoutId={`database-menu-item-${database.id}`}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 },
                    }}
                  >
                    <DatabaseMenuItem
                      database={database}
                      isActive={database.id === currentDatabaseId}
                      onClick={() => {
                        if (isSmallBreakpoint) {
                          setShowSidebar(false)
                        }
                      }}
                    />
                  </m.div>
                ))}
              </m.div>
            ) : (
              <div className="flex-1 flex flex-col gap-2 my-10 mx-5 items-center text-base text-neutral-400 opacity-75">
                {isLoadingDatabases ? (
                  <Loader className="animate-spin" size={48} strokeWidth={0.75} />
                ) : (
                  <>
                    <DbIcon size={48} strokeWidth={0.75} />
                    <span>No databases</span>
                    {!isLegacyDomain && (
                      <a
                        className="mt-2 underline cursor-pointer text-xs text-primary/50"
                        onClick={() => setIsRenameDialogOpen(true)}
                      >
                        Where did my databases go?
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
            <m.div layout="position" layoutId="theme-dropdown">
              <ThemeDropdown className="w-full" />
            </m.div>
            {user && (
              <m.div layout="position" layoutId="sign-out-button">
                <Button
                  className="w-full gap-2"
                  variant="secondary"
                  onClick={async () => {
                    await signOut()
                  }}
                >
                  <LogOut size={18} strokeWidth={2} />
                  Sign out
                </Button>
              </m.div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Desktop collapsed sidebar */}
      {!showSidebar && (
        <div className="hidden lg:flex flex-col p-4 pr-1 justify-between overflow-hidden z-10">
          <div className="flex-1 flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <m.div
                  layout="position"
                  layoutId={isSmallBreakpoint ? undefined : 'sidebar-collapse'}
                >
                  <Button
                    variant={'ghost'}
                    size="icon"
                    onClick={() => {
                      setShowSidebar(true)
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
                <m.div
                  layout="position"
                  layoutId={isSmallBreakpoint ? undefined : 'new-database-button'}
                >
                  <Button
                    size={'icon'}
                    onClick={() => {
                      if (!user) {
                        setIsSignInDialogOpen(true)
                      } else {
                        router.push('/')
                        focusRef.current?.focus()
                      }
                    }}
                  >
                    <PackagePlus size={18} />
                  </Button>
                </m.div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>New database</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <m.div
                  layout="position"
                  layoutId={isSmallBreakpoint ? undefined : 'theme-dropdown'}
                >
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
                  <m.div
                    layout="position"
                    layoutId={isSmallBreakpoint ? undefined : 'sign-out-button'}
                  >
                    <Button
                      size={'icon'}
                      variant="secondary"
                      onClick={async () => {
                        await signOut()
                      }}
                    >
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
        </div>
      )}

      {/* Mobile header */}
      <div className="flex m-4 mb-0 justify-between lg:hidden">
        <div className="flex-1 flex gap-2 justify-between">
          <Button
            variant={'ghost'}
            size="icon"
            onClick={() => {
              setShowSidebar(true)
            }}
          >
            <Menu size={22} />
          </Button>
          <Button
            className={cn(showSidebar ? 'hidden' : 'inline-flex')}
            size={'icon'}
            onClick={() => {
              if (!user) {
                setIsSignInDialogOpen(true)
              } else {
                router.push('/')
                focusRef.current?.focus()
              }
            }}
          >
            <PackagePlus size={22} />
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {showSidebar && (
        <m.div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => {
            setShowSidebar(false)
          }}
        />
      )}
    </>
  )
}

'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Database as DbIcon,
  Download,
  Loader,
  LogOut,
  MoreVertical,
  PackagePlus,
  Pencil,
  PlugIcon,
  RadioIcon,
  Trash2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useDatabaseDeleteMutation } from '~/data/databases/database-delete-mutation'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useDatabasesQuery } from '~/data/databases/databases-query'
import { useDeployWaitlistCreateMutation } from '~/data/deploy-waitlist/deploy-waitlist-create-mutation'
import { useIsOnDeployWaitlistQuery } from '~/data/deploy-waitlist/deploy-waitlist-query'
import { Database } from '~/lib/db'
import { downloadFile, titleToKebabCase } from '~/lib/util'
import { cn } from '~/lib/utils'
import { useApp } from './app-provider'
import { CodeBlock } from './code-block'
import SignInButton from './sign-in-button'
import ThemeDropdown from './theme-dropdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { TooltipPortal } from '@radix-ui/react-tooltip'
import { LiveShareIcon } from './live-share-icon'

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
  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <>
      <Dialog
        open={isSignInDialogOpen}
        onOpenChange={(open) => {
          setIsSignInDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign in to create a database</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <h2 className="font-bold">Why do I need to sign in?</h2>
          <p>
            Even though your Postgres databases run{' '}
            <a
              className="underline"
              href="https://pglite.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              directly in the browser
            </a>
            , we still need to connect to an API that runs the large language model (required for
            all database interactions).
          </p>
          <p>We ask you to sign in to prevent API abuse.</p>
          <div className="flex justify-center items-center my-3">
            <SignInButton />
          </div>
        </DialogContent>
      </Dialog>
      <AnimatePresence initial={false} mode="popLayout">
        {showSidebar && (
          <m.div
            className="max-w-72 w-full h-full flex flex-col gap-2 items-stretch p-4 bg-card"
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
      {!showSidebar && (
        <div className="flex flex-col pl-4 py-4 justify-between">
          <div className="flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <m.div layout="position" layoutId="sidebar-collapse">
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
                <m.div layout="position" layoutId="new-database-button">
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
                    <PackagePlus size={14} />
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
    </>
  )
}

type DatabaseMenuItemProps = {
  database: Database
  isActive: boolean
}

function DatabaseMenuItem({ database, isActive }: DatabaseMenuItemProps) {
  const router = useRouter()
  const { user, dbManager, liveShare } = useApp()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { mutateAsync: deleteDatabase } = useDatabaseDeleteMutation()
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false)

  const { data: isOnDeployWaitlist } = useIsOnDeployWaitlistQuery()
  const { mutateAsync: joinDeployWaitlist } = useDeployWaitlistCreateMutation()

  return (
    <>
      <Dialog
        open={isDeployDialogOpen}
        onOpenChange={(open) => {
          setIsDeployDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deployments are in Private Alpha</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <h2 className="font-bold">What are deployments?</h2>
          <p>
            Deploy your database to a serverless PGlite instance so that it can be accessed outside
            the browser using any Postgres client:
          </p>
          <CodeBlock
            className="language-curl bg-neutral-800"
            language="curl"
            hideLineNumbers
            theme="dark"
          >
            {`psql "postgres://postgres:<password>@<your-unique-server>/postgres"`}
          </CodeBlock>
          <div className="flex justify-center items-center mt-3">
            <AnimatePresence initial={false}>
              {!isOnDeployWaitlist ? (
                <button
                  className="px-4 py-3 bg-foreground text-background rounded-md"
                  onClick={async () => {
                    await joinDeployWaitlist()
                  }}
                >
                  Join Private Alpha
                </button>
              ) : (
                <m.div
                  className="px-4 py-3 border-2 rounded-md text-center border-dashed"
                  variants={{
                    hidden: { scale: 0 },
                    show: { scale: 1 },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  <h3 className="font-medium mb-2">🎉 You&apos;re on the waitlist!</h3>
                  <p>We&apos;ll send you an email when you have access to deploy.</p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      <Link
        data-active={isActive || isPopoverOpen}
        className={cn(
          'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 px-3 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
        )}
        href={`/db/${database.id}`}
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
        <span className="text-nowrap grow truncate">{database.name ?? 'My database'}</span>
        <DropdownMenu
          modal={false}
          onOpenChange={(open) => {
            setIsPopoverOpen(open)
            if (!open) {
              setIsRenaming(false)
            }
          }}
          open={isPopoverOpen}
        >
          <DropdownMenuTrigger
            className="group/trigger outline-none"
            onClick={(e) => {
              e.preventDefault()
              setIsPopoverOpen(true)
            }}
          >
            <MoreVertical
              size={16}
              className={cn(
                isActive
                  ? 'text-muted-foreground'
                  : 'text-transparent group-hover:text-muted-foreground focus-visible:text-muted-foreground group-focus/trigger:text-muted-foreground',
                'group-data-[state=open]/trigger:text-foreground',
                'transition'
              )}
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start">
            {isRenaming ? (
              <form
                className="w-72"
                onSubmit={async (e) => {
                  e.preventDefault()

                  if (e.target instanceof HTMLFormElement) {
                    const formData = new FormData(e.target)
                    const name = formData.get('name')

                    if (typeof name === 'string') {
                      await updateDatabase({ ...database, name })
                    }
                  }

                  setIsPopoverOpen(false)
                  setIsRenaming(false)
                }}
              >
                <input
                  name="name"
                  className="flex-grow w-full p-2 outline-none text-base bg-inherit placeholder:text-neutral-400"
                  placeholder={`Rename ${database.name}`}
                  defaultValue={database.name ?? undefined}
                  autoComplete="off"
                  autoFocus
                />
              </form>
            ) : (
              <div className="flex flex-col items-stretch w-32">
                <DropdownMenuItem
                  className="gap-3"
                  onSelect={async (e) => {
                    e.preventDefault()
                    setIsRenaming(true)
                  }}
                >
                  <Pencil
                    size={16}
                    strokeWidth={2}
                    className="flex-shrink-0 text-muted-foreground"
                  />
                  <span>Rename</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-3"
                  onSelect={async (e) => {
                    e.preventDefault()

                    if (!dbManager) {
                      throw new Error('dbManager is not available')
                    }

                    const db = await dbManager.getDbInstance(database.id)
                    const dumpBlob = await db.dumpDataDir()

                    const fileName = `${titleToKebabCase(database.name ?? 'My Database')}-${Date.now()}`
                    const file = new File([dumpBlob], fileName, { type: dumpBlob.type })

                    downloadFile(file)
                  }}
                >
                  <Download
                    size={16}
                    strokeWidth={2}
                    className="flex-shrink-0 text-muted-foreground"
                  />

                  <span>Download</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                  onClick={async (e) => {
                    e.preventDefault()

                    setIsDeployDialogOpen(true)
                    setIsPopoverOpen(false)
                  }}
                  disabled={user === undefined}
                >
                  <Upload
                    size={16}
                    strokeWidth={2}
                    className="flex-shrink-0 text-muted-foreground"
                  />
                  <span>Deploy</span>
                </DropdownMenuItem>
                <LiveShareMenuItem
                  databaseId={database.id}
                  isActive={isActive}
                  setIsPopoverOpen={setIsPopoverOpen}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-3"
                  onSelect={async (e) => {
                    e.preventDefault()
                    setIsPopoverOpen(false)
                    await deleteDatabase({ id: database.id })

                    if (isActive) {
                      router.push('/')
                    }
                  }}
                >
                  <Trash2
                    size={16}
                    strokeWidth={2}
                    className="flex-shrink-0 text-muted-foreground"
                  />
                  <span>Delete</span>
                </DropdownMenuItem>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>
    </>
  )
}

type ConnectMenuItemProps = {
  databaseId: string
  isActive: boolean
  setIsPopoverOpen: (open: boolean) => void
}

function LiveShareMenuItem(props: ConnectMenuItemProps) {
  const { liveShare, user } = useApp()
  const router = useRouter()

  if (liveShare.isLiveSharing && liveShare.databaseId === props.databaseId) {
    return (
      <DropdownMenuItem
        className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
        onClick={async (e) => {
          e.preventDefault()
          liveShare.stop()
          props.setIsPopoverOpen(false)
        }}
      >
        <PlugIcon size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
        <span>Stop sharing</span>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem
      disabled={!user}
      className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
      onClick={async (e) => {
        e.preventDefault()
        if (liveShare.isLiveSharing) {
          liveShare.stop()
        }
        liveShare.start(props.databaseId)
        router.push(`/db/${props.databaseId}`)
        props.setIsPopoverOpen(false)
      }}
    >
      <LiveShareIcon size={16} className="flex-shrink-0 text-muted-foreground" />
      <span>Live Share</span>
    </DropdownMenuItem>
  )
}

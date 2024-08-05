'use client'

import 'chart.js/auto'
import 'chartjs-adapter-date-fns'

import { AnimatePresence, LazyMotion, m } from 'framer-motion'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  CircleEllipsis,
  Database as DbIcon,
  Loader,
  LogOut,
  PackagePlus,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PropsWithChildren, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { useDatabaseDeleteMutation } from '~/data/databases/database-delete-mutation'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useDatabasesQuery } from '~/data/databases/databases-query'
import { Database, getDb } from '~/lib/db'
import { useAsyncMemo } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { CodeBlock } from './code-block'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { useApp } from './app-provider'

const loadFramerFeatures = () => import('./framer-features').then((res) => res.default)

export type LayoutProps = PropsWithChildren

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isPreview, pgliteVersion, pgVersion } = useApp()
  let { id: currentDatabaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <LazyMotion features={loadFramerFeatures}>
      <TooltipProvider delayDuration={0}>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {isPreview && (
            <div className="px-3 py-2 flex justify-center text-sm text-center bg-neutral-800 text-white">
              Heads up! This is a preview version of postgres.new, so expect some changes here and
              there.
            </div>
          )}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <AnimatePresence initial={false} mode="popLayout">
              {showSidebar && (
                <m.div
                  className="max-w-72 w-full h-full flex flex-col gap-2 items-stretch p-4 bg-neutral-100"
                  variants={{
                    hidden: { opacity: 0, x: '-100%' },
                    show: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: 0.25 }}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                >
                  <div className="flex justify-between text-neutral-500">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <m.div layout="position" layoutId="sidebar-collapse">
                          <Button
                            className="bg-inherit hover:bg-neutral-200 text-sm flex gap-3"
                            onClick={() => {
                              setShowSidebar(false)
                            }}
                          >
                            <ArrowLeftToLine />
                          </Button>
                        </m.div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-black text-white">
                        <p>Close sidebar</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <m.div layout="position" layoutId="new-database-button">
                          <Button
                            className="bg-inherit hover:bg-neutral-200 text-sm flex gap-3"
                            onClick={() => {
                              router.push('/')
                            }}
                          >
                            <PackagePlus />
                          </Button>
                        </m.div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-black text-white">
                        <p>New database</p>
                      </TooltipContent>
                    </Tooltip>
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
                        </>
                      )}
                    </div>
                  )}
                  {user && (
                    <Button
                      className="flex flex-row gap-2 items-center mx-2 hover:bg-black/10"
                      onClick={async () => {
                        await signOut()
                      }}
                    >
                      <LogOut size={18} strokeWidth={2} />
                      Sign out
                    </Button>
                  )}
                </m.div>
              )}
            </AnimatePresence>
            {!showSidebar && (
              <div className="flex flex-col gap-2 pl-4 py-4 justify-start text-neutral-500">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <m.div layoutId="sidebar-collapse">
                      <Button
                        className="bg-inherit justify-start hover:bg-neutral-200 text-sm flex gap-3"
                        onClick={() => {
                          setShowSidebar(true)
                        }}
                      >
                        <ArrowRightToLine />
                      </Button>
                    </m.div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-black text-white">
                    <p>Open sidebar</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <m.div layoutId="new-database-button">
                      <Button
                        className="bg-inherit justify-end hover:bg-neutral-200 text-sm flex gap-3"
                        onClick={() => {
                          router.push('/')
                        }}
                      >
                        <PackagePlus />
                      </Button>
                    </m.div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-black text-white">
                    <p>New database</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            <m.div layout="position" className="w-full h-full min-w-0">
              {children}
            </m.div>
          </div>
        </div>
      </TooltipProvider>
    </LazyMotion>
  )
}

type DatabaseMenuItemProps = {
  database: Database
  isActive: boolean
}

function DatabaseMenuItem({ database, isActive }: DatabaseMenuItemProps) {
  const router = useRouter()

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)

  const [publishServerName, setPublishServerName] = useState<string>()
  const [publishErrorMessage, setPublishErrorMessage] = useState<string>()

  const { mutateAsync: deleteDatabase } = useDatabaseDeleteMutation()
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const { value: db } = useAsyncMemo(() => getDb(database.id), [database])

  const [isRenaming, setIsRenaming] = useState(false)

  return (
    <Link
      data-active={isActive || isPopoverOpen}
      className={cn(
        'group text-sm w-full relative bg-inherit justify-start bg-neutral-100 hover:bg-neutral-200 flex gap-3 p-3 rounded-md overflow-hidden data-[active=true]:bg-neutral-200'
      )}
      href={`/db/${database.id}`}
    >
      <span className="text-nowrap">{database.name ?? 'My database'}</span>
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0',
          'w-8 bg-gradient-to-l from-neutral-100 from-0%',
          'group-hover:w-16 group-hover:from-neutral-200 group-hover:from-50%',
          'group-data-[active=true]:w-16 group-data-[active=true]:from-neutral-200 group-data-[active=true]:from-50%'
        )}
      />
      <Dialog
        open={isPublishDialogOpen}
        onOpenChange={(open) => {
          setIsPublishDialogOpen(open)
        }}
      >
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent>
          {publishErrorMessage ? (
            <>
              <DialogHeader>
                <DialogTitle>Publish failed</DialogTitle>
                <DialogDescription>There was an error publishing your database.</DialogDescription>
              </DialogHeader>
              <p className="text-destructive">{publishErrorMessage}</p>
            </>
          ) : publishServerName ? (
            <>
              <DialogHeader className="gap-2">
                <DialogTitle>Database published</DialogTitle>
                <DialogDescription>
                  Your database <strong>{database.name}</strong> has been published and is now
                  accessible outside of the browser.
                </DialogDescription>
              </DialogHeader>
              <CodeBlock className="language-curl" language="curl" hideLineNumbers>
                psql -h {publishServerName} -U postgres
              </CodeBlock>
            </>
          ) : (
            <>
              <DialogHeader className="gap-2">
                <DialogTitle>Publishing database...</DialogTitle>
                <DialogDescription>
                  We&apos;re uploading your database <strong>{database.name}</strong> so that it can
                  be accessed outside of the browser.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center items-center">
                <Loader className="animate-spin" size={48} strokeWidth={0.75} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Popover
        onOpenChange={(open) => {
          setIsPopoverOpen(open)
          if (!open) {
            setIsRenaming(false)
          }
        }}
        open={isPopoverOpen}
      >
        <PopoverTrigger
          asChild
          onClick={(e) => {
            e.preventDefault()
            setIsPopoverOpen(true)
          }}
        >
          <div
            className={cn(
              'hidden group-hover:flex absolute right-0 top-0 bottom-0 p-2 opacity-50 items-center',
              isActive || isPopoverOpen ? 'flex' : undefined
            )}
          >
            <CircleEllipsis size={24} />
          </div>
        </PopoverTrigger>

        <PopoverContent className="p-2 flex flex-col overflow-hidden w-auto" portal>
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
                className="flex-grow w-full border-none focus-visible:ring-0 text-base bg-inherit placeholder:text-neutral-400"
                placeholder={`Rename ${database.name}`}
                defaultValue={database.name ?? undefined}
                autoComplete="off"
                autoFocus
              />
            </form>
          ) : (
            <div className="flex flex-col items-stretch w-32">
              <Button
                className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                onClick={async (e) => {
                  e.preventDefault()
                  setIsRenaming(true)
                }}
              >
                <Pencil size={16} strokeWidth={2} className="flex-shrink-0" />

                <span>Rename</span>
              </Button>
              <Button
                className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                onClick={async (e) => {
                  e.preventDefault()

                  setIsPublishDialogOpen(true)
                  setIsPopoverOpen(false)

                  if (!db) {
                    // TODO: show error;
                    return
                  }

                  const dump = await db.dumpDataDir()
                  const response = await fetch(`/api/databases/${database.id}/upload`, {
                    method: 'POST',
                    body: dump,
                  })

                  type Result =
                    | { success: true; data: { serverName: string } }
                    | { success: false; error: string }

                  const result: Result = await response.json()

                  if (result.success) {
                    setPublishServerName(result.data.serverName)
                  } else {
                    setPublishErrorMessage(result.error)
                  }
                }}
                disabled={db === undefined}
              >
                <Upload size={16} strokeWidth={2} className="flex-shrink-0" />

                <span>Publish</span>
              </Button>
              <Button
                className="bg-inherit text-destructive-600 justify-start hover:bg-neutral-200 flex gap-3"
                onClick={async (e) => {
                  e.preventDefault()
                  setIsPopoverOpen(false)
                  await deleteDatabase({ id: database.id })

                  if (isActive) {
                    router.push('/')
                  }
                }}
              >
                <Trash2 size={16} strokeWidth={2} className="flex-shrink-0" />

                <span>Delete</span>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </Link>
  )
}

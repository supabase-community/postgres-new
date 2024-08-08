'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  CircleEllipsis,
  Database as DbIcon,
  Download,
  Loader,
  LogOut,
  PackagePlus,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
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

export default function Sidebar() {
  const { user, signOut } = useApp()
  let { id: currentDatabaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <>
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
                <m.div layout="position" layoutId="sign-out-button">
                  <LogOut size={18} strokeWidth={2} />
                </m.div>
                Sign out
              </Button>
            )}
          </m.div>
        )}
      </AnimatePresence>
      {!showSidebar && (
        <div className="flex flex-col pl-4 py-4 justify-between text-neutral-500">
          <div className="flex flex-col gap-2">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <m.div layout="position" layoutId="sign-out-button">
                <Button
                  className="bg-inherit justify-end justify-self-end hover:bg-neutral-200 text-sm flex gap-3"
                  onClick={async () => {
                    await signOut()
                  }}
                >
                  <LogOut size={18} strokeWidth={3} />
                </Button>
              </m.div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-black text-white">
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
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
  const { user, dbManager } = useApp()
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
          <h2 className="font-medium">What are deployments?</h2>
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
                  className="px-4 py-3 bg-black text-white rounded-md"
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
                  <Download size={16} strokeWidth={2} className="flex-shrink-0" />

                  <span>Download</span>
                </Button>
                <Button
                  className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                  onClick={async (e) => {
                    e.preventDefault()

                    setIsDeployDialogOpen(true)
                    setIsPopoverOpen(false)
                  }}
                  disabled={user === undefined}
                >
                  <Upload size={16} strokeWidth={2} className="flex-shrink-0" />

                  <span>Deploy</span>
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
    </>
  )
}

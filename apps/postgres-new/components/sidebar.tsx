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
import { Database } from '~/lib/db'
import { downloadFile, titleToKebabCase } from '~/lib/util'
import { cn } from '~/lib/utils'
import { useApp } from './app-provider'
import { CodeBlock } from './code-block'
import ThemeDropdown from './theme-dropdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { DialogPortal } from '@radix-ui/react-dialog'
import React from 'react'

export default function Sidebar() {
  const { user, signOut, focusRef } = useApp()
  let { id: currentDatabaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <>
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
                    router.push('/')
                    focusRef.current?.focus()
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
                      router.push('/')
                      focusRef.current?.focus()
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
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [hasOpenDialog, setHasOpenDialog] = useState(false)
  function handleDialogMenuItemOpenChange(open: boolean) {
    setHasOpenDialog(open)
    if (open === false) {
      setIsDropdownOpen(false)
    }
  }

  return (
    <Link
      data-active={isActive || isDropdownOpen}
      className={cn(
        'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 px-3 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
      )}
      href={`/db/${database.id}`}
    >
      <span className="text-nowrap grow truncate">{database.name ?? 'My database'}</span>
      <DropdownMenu modal={false} open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger className="group/trigger outline-none" asChild>
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

        <DropdownMenuContent side="right" align="start" hidden={hasOpenDialog}>
          {isRenaming ? (
            <RenameDatabaseForm
              database={database}
              onSuccess={() => {
                setIsDropdownOpen(false)
                setIsRenaming(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-stretch w-32">
              <RenameMenuItem
                database={database}
                onSelect={(e) => {
                  e.preventDefault()
                  setIsRenaming(true)
                }}
              />
              <DownloadMenuItem database={database} />
              <DeployDialogMenuItem
                database={database}
                onDialogOpenChange={handleDialogMenuItemOpenChange}
              />
              <DropdownMenuSeparator />
              <DeleteMenuItem database={database} isActive={isActive} />
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  )
}

function DeleteMenuItem(props: { database: Database; isActive: boolean }) {
  const router = useRouter()
  const { mutateAsync: deleteDatabase } = useDatabaseDeleteMutation()

  async function handleMenuItemSelect(e: Event) {
    await deleteDatabase({ id: props.database.id })

    if (props.isActive) {
      router.push('/')
    }
  }

  return (
    <DropdownMenuItem className="gap-3" onSelect={handleMenuItemSelect}>
      <Trash2 size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      <span>Delete</span>
    </DropdownMenuItem>
  )
}

function RenameDatabaseForm(props: { database: Database; onSuccess: () => void }) {
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  return (
    <form
      className="w-72"
      onSubmit={async (e) => {
        e.preventDefault()
        if (e.target instanceof HTMLFormElement) {
          const formData = new FormData(e.target)
          const name = formData.get('name')

          if (typeof name === 'string') {
            await updateDatabase({ ...props.database, name })
          }
        }
        props.onSuccess()
      }}
    >
      <input
        name="name"
        className="flex-grow w-full p-2 outline-none text-base bg-inherit placeholder:text-neutral-400"
        placeholder={`Rename ${props.database.name}`}
        defaultValue={props.database.name ?? undefined}
        autoComplete="off"
        autoFocus
      />
    </form>
  )
}

function RenameMenuItem(props: { database: Database; onSelect: (e: Event) => void }) {
  return (
    <DropdownMenuItem className="gap-3" onSelect={props.onSelect}>
      <Pencil size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      <span>Rename</span>
    </DropdownMenuItem>
  )
}

function DownloadMenuItem({ database }: { database: Database }) {
  const { dbManager } = useApp()

  async function handleMenuItemSelect(e: Event) {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }

    const db = await dbManager.getDbInstance(database.id)
    const dumpBlob = await db.dumpDataDir()

    const fileName = `${titleToKebabCase(database.name ?? 'My Database')}-${Date.now()}`
    const file = new File([dumpBlob], fileName, { type: dumpBlob.type })

    downloadFile(file)
  }

  return (
    <DropdownMenuItem className="gap-3" onSelect={handleMenuItemSelect}>
      <Download size={16} strokeWidth={2} className="flex-shrink-0" />

      <span>Download</span>
    </DropdownMenuItem>
  )
}

type DeployResult = {
  username: string
  password: string
  serverName: string
}

function DeployDialogMenuItem(props: {
  database: Database
  onDialogOpenChange: (isOpen: boolean) => void
}) {
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <DeployMenuItem
        database={props.database}
        onDeploySuccess={(data) => {
          setDeployResult(data)
          setIsDialogOpen(true)
          props.onDialogOpenChange(true)
        }}
      />
      {deployResult && (
        <DeployDialog
          open={isDialogOpen}
          onOpenChange={props.onDialogOpenChange}
          {...deployResult}
        />
      )}
    </>
  )
}

function DeployDialog(
  props: {
    open: boolean
    onOpenChange: (open: boolean) => void
  } & DeployResult
) {
  const { username, password, serverName } = props
  const psqlCommand = `psql "postgres://${username}:${encodeURIComponent(password)}@${serverName}/postgres"`

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your database has been deployed</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <h2 className="font-medium">What are deployments?</h2>
          <p>
            Your database has been deployed to a serverless PGlite instance so that it can be
            accessed outside the browser using any Postgres client:
          </p>
          <CodeBlock
            className="language-curl bg-neutral-800"
            language="curl"
            hideLineNumbers
            theme="dark"
            value={psqlCommand}
          >
            {psqlCommand}
          </CodeBlock>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function DeployMenuItem(props: {
  database: Database
  onDeploySuccess: (data: DeployResult) => void
}) {
  const { dbManager, user } = useApp()
  const [isDeploying, setIsDeploying] = useState(false)

  async function handleMenuItemSelect(e: Event) {
    e.preventDefault()

    setIsDeploying(true)

    if (!dbManager) {
      throw new Error('No dbManager')
    }

    const db = await dbManager.getDbInstance(props.database.id)
    const dump = await db.dumpDataDir()
    const response = await fetch(`/api/databases/${props.database.id}/upload`, {
      method: 'POST',
      body: dump,
    })

    setIsDeploying(false)

    type Result = { success: true; data: DeployResult } | { success: false; error: string }

    const result: Result = await response.json()

    if (result.success) {
      props.onDeploySuccess(result.data)
    } else {
      // TODO: use a toast for errors
      console.error(result.error)
    }
  }

  return (
    <DropdownMenuItem
      className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
      disabled={user === undefined}
      onSelect={handleMenuItemSelect}
    >
      {isDeploying ? (
        <Loader
          className="animate-spin flex-shrink-0 text-muted-foreground"
          size={16}
          strokeWidth={2}
        />
      ) : (
        <Upload size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      )}

      <span>Deploy</span>
    </DropdownMenuItem>
  )
}

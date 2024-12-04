import { TooltipPortal } from '@radix-ui/react-tooltip'
import {
  Download,
  Loader2,
  MoreVertical,
  Pencil,
  PlugIcon,
  RadioIcon,
  Trash2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import AwsIcon from '~/assets/aws-icon'
import { useApp } from '~/components/app-provider'
import { DeployDialog } from '~/components/deploy/deploy-dialog'
import { DeployFailureDialog } from '~/components/deploy/deploy-failure-dialog'
import { SupabaseDeploymentInfo } from '~/components/deploy/deploy-info'
import { DeployInfoDialog } from '~/components/deploy/deploy-info-dialog'
import { DeploySuccessDialog } from '~/components/deploy/deploy-success-dialog'
import { IntegrationDialog } from '~/components/deploy/integration-dialog'
import { RedeployDialog } from '~/components/deploy/redeploy-dialog'
import { LiveShareIcon } from '~/components/live-share-icon'
import { useIsLocked } from '~/components/lock-provider'
import { SupabaseIcon } from '~/components/supabase-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useDatabaseDeleteMutation } from '~/data/databases/database-delete-mutation'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useIntegrationQuery } from '~/data/integrations/integration-query'
import type { MergedDatabase } from '~/data/merged-databases/merged-database'
import { useQueryEvent } from '~/lib/hooks'
import { downloadFileFromUrl, getDeployUrl, getOauthUrl, titleToKebabCase } from '~/lib/util'
import { cn } from '~/lib/utils'

export type DatabaseMenuItemProps = {
  database: MergedDatabase
  isActive: boolean
  onClick?: () => void
}

export function DatabaseMenuItem({ database, isActive, onClick }: DatabaseMenuItemProps) {
  const router = useRouter()
  const { user, dbManager, liveShare } = useApp()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { mutateAsync: deleteDatabase } = useDatabaseDeleteMutation()
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()
  const { data: supabaseIntegration, isLoading: isLoadingSupabaseIntegration } =
    useIntegrationQuery('Supabase')

  const [isRenaming, setIsRenaming] = useState(false)

  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false)
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false)
  const [isDeployInfoDialogOpen, setIsDeployInfoDialogOpen] = useState(false)
  const [isRedeployDialogOpen, setIsRedeployDialogOpen] = useState(false)
  const [isDeploySuccessDialogOpen, setIsDeploySuccessDialogOpen] = useState(false)
  const [isDeployFailureDialogOpen, setIsDeployFailureDialogOpen] = useState(false)

  const [deployInfo, setDeployInfo] = useState<SupabaseDeploymentInfo>()
  const [deployError, setDeployError] = useState<string>()

  const isDeploying = isIntegrationDialogOpen || isDeployDialogOpen || isRedeployDialogOpen
  const supabaseDeployment = database.deployments.find((d) => d.provider_name === 'Supabase')

  /**
   * Starts the deploy flow.
   * - If the user has not connected to Supabase, open the integration dialog.
   * - If the user has already deployed to Supabase, open the redeploy dialog.
   * - Otherwise, open the deploy dialog.
   */
  const startDeployFlow = useCallback(() => {
    setIsIntegrationDialogOpen(false)
    setIsDeployDialogOpen(false)
    setIsDeployInfoDialogOpen(false)
    setIsRedeployDialogOpen(false)
    setIsDeploySuccessDialogOpen(false)
    setIsDeployFailureDialogOpen(false)

    if (!isLoadingSupabaseIntegration && !supabaseIntegration) {
      setIsIntegrationDialogOpen(true)
    } else if (supabaseDeployment) {
      setIsDeployInfoDialogOpen(true)
    } else {
      setIsDeployDialogOpen(true)
    }
  }, [supabaseDeployment, supabaseIntegration, isLoadingSupabaseIntegration])

  useQueryEvent('deploy.start', (params) => {
    if (!isActive) {
      return
    }
    const provider = params.get('provider')?.toLowerCase()
    if (provider === 'supabase') {
      startDeployFlow()
    }
  })

  useQueryEvent('deploy.success', (params) => {
    if (!isActive) {
      return
    }
    const deployInfoJson = params.get('project')
    const deployInfo = deployInfoJson ? JSON.parse(deployInfoJson) : undefined
    if (deployInfo) {
      setDeployInfo(deployInfo)
      setIsDeploySuccessDialogOpen(true)
    }
  })

  useQueryEvent('deploy.failure', (params) => {
    if (!isActive) {
      return
    }
    const errorMessage = params.get('error')
    if (errorMessage) {
      setDeployError(errorMessage)
      setIsDeployFailureDialogOpen(true)
    }
  })

  const isLocked = useIsLocked(database.id, true)

  return (
    <>
      <IntegrationDialog
        open={isIntegrationDialogOpen}
        onOpenChange={(open) => {
          setIsIntegrationDialogOpen(open)
        }}
        onConfirm={() => {
          router.push(getOauthUrl({ databaseId: database.id }))
        }}
      />
      <DeployDialog
        databaseId={database.id}
        open={isDeployDialogOpen}
        onOpenChange={(open) => {
          setIsDeployDialogOpen(open)
        }}
        onConfirm={() => {
          if (!supabaseIntegration) {
            startDeployFlow()
            return
          }

          const deployUrl = getDeployUrl({
            databaseId: database.id,
            integrationId: supabaseIntegration.id,
          })

          router.push(deployUrl)
        }}
      />
      {supabaseDeployment && (
        <DeployInfoDialog
          open={isDeployInfoDialogOpen}
          onOpenChange={setIsDeployInfoDialogOpen}
          deployedDatabase={supabaseDeployment}
          onRedeploy={() => {
            setIsRedeployDialogOpen(true)
          }}
        />
      )}
      <RedeployDialog
        database={database}
        open={isRedeployDialogOpen}
        onOpenChange={setIsRedeployDialogOpen}
        onConfirm={() => {
          if (!supabaseIntegration) {
            startDeployFlow()
            return
          }

          const deployUrl = getDeployUrl({
            databaseId: database.id,
            integrationId: supabaseIntegration.id,
          })

          router.push(deployUrl)
        }}
      />
      {deployInfo && (
        <DeploySuccessDialog
          open={isDeploySuccessDialogOpen}
          onOpenChange={setIsDeploySuccessDialogOpen}
          deployInfo={deployInfo}
        />
      )}
      {deployError && (
        <DeployFailureDialog
          open={isDeployFailureDialogOpen}
          onOpenChange={setIsDeployFailureDialogOpen}
          errorMessage={deployError}
        />
      )}

      <Link
        data-active={isActive || isPopoverOpen}
        className={cn(
          'group text-sm w-full relative justify-start bg-card hover:bg-muted/50 flex gap-2 px-3 h-10 items-center rounded-md overflow-hidden data-[active=true]:bg-accent transition'
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
          {/* <DropdownMenuTrigger
            className="group/trigger outline-none"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
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
          </DropdownMenuTrigger> */}

          <DropdownMenuContent
            side="bottom"
            align="start"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
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
              <div className="flex flex-col items-stretch">
                <DropdownMenuItem
                  disabled={isLocked}
                  className="gap-3"
                  onClick={async (e) => {
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
                  disabled={isLocked}
                  className="gap-3"
                  onClick={async (e) => {
                    e.preventDefault()

                    if (!dbManager) {
                      throw new Error('dbManager is not available')
                    }

                    // Ensure the db worker is ready
                    await dbManager.getDbInstance(database.id)

                    const bc = new BroadcastChannel(`${database.id}:pg-dump`)

                    bc.addEventListener('message', (event) => {
                      if (event.data.action === 'dump-result') {
                        downloadFileFromUrl(event.data.url, event.data.filename)
                        bc.close()
                        setIsPopoverOpen(false)
                      }
                    })

                    bc.postMessage({
                      action: 'execute-dump',
                      filename: `${titleToKebabCase(database.name ?? 'My Database')}-${Date.now()}.sql`,
                    })
                  }}
                >
                  <Download
                    size={16}
                    strokeWidth={2}
                    className="flex-shrink-0 text-muted-foreground"
                  />

                  <span>Download</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <DropdownMenuSubTrigger
                        disabled={!user}
                        className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3 cursor-pointer"
                        chevronRightClassName="text-muted-foreground"
                      >
                        {isDeploying ? (
                          <Loader2
                            className="animate-spin flex-shrink-0 text-muted-foreground"
                            size={16}
                            strokeWidth={2}
                          />
                        ) : (
                          <Upload
                            size={16}
                            strokeWidth={2}
                            className="flex-shrink-0 text-muted-foreground"
                          />
                        )}
                        <span>Deploy</span>
                      </DropdownMenuSubTrigger>
                    </TooltipTrigger>
                    <TooltipPortal>
                      {!user && <TooltipContent side="right">Sign in to deploy</TooltipContent>}
                    </TooltipPortal>
                  </Tooltip>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                        onClick={async (e) => {
                          e.preventDefault()
                          startDeployFlow()
                        }}
                      >
                        <SupabaseIcon />
                        <span>Supabase</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
                        disabled
                      >
                        <AwsIcon />
                        <span>
                          AWS <span className="text-xs text-foreground/75">(coming soon)</span>
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <LiveShareMenuItem
                  databaseId={database.id}
                  isActive={isActive}
                  onStart={() => {
                    setIsPopoverOpen(false)
                    onClick?.()
                  }}
                  onStop={() => {
                    setIsPopoverOpen(false)
                    onClick?.()
                  }}
                  disabled={user === undefined || isLocked}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isLocked}
                  className="gap-3"
                  onClick={async (e) => {
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
  disabled?: boolean
  onStart?: () => void
  onStop?: () => void
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
          props.onStop?.()
        }}
      >
        <PlugIcon size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
        <span>Stop sharing</span>
      </DropdownMenuItem>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default">
        <DropdownMenuItem
          disabled={props.disabled}
          className="bg-inherit justify-start hover:bg-neutral-200 flex gap-3"
          onClick={async (e) => {
            e.preventDefault()
            if (liveShare.isLiveSharing) {
              liveShare.stop()
            }
            liveShare.start(props.databaseId)
            router.push(`/db/${props.databaseId}`)
            props.onStart?.()
          }}
        >
          <LiveShareIcon size={16} className="flex-shrink-0 text-muted-foreground" />
          <span>Live Share</span>
        </DropdownMenuItem>
      </TooltipTrigger>
      <TooltipPortal>
        {!user && <TooltipContent side="right">Sign in to live share</TooltipContent>}
      </TooltipPortal>
    </Tooltip>
  )
}

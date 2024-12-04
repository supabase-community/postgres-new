/* eslint-disable react/no-unescaped-entities */
import { ChevronDown, Loader } from 'lucide-react'
import AwsIcon from '~/assets/aws-icon'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useApp } from '~/components/app-provider'
import { useIntegrationQuery } from '~/data/integrations/integration-query'
import { MergedDatabase } from '~/data/merged-databases/merged-database'
import { DeploySupabaseTab } from './deploy-supabase-tab'
import { ConnectSupabaseTab } from './connect-supabase-tab'
import { useQueryEvent } from '~/lib/hooks'
import { useState } from 'react'
import { SupabaseDeploymentInfo } from '~/components/deploy/deploy-info'
import { DeploySuccessDialog } from '~/components/deploy/deploy-success-dialog'
import { DeployFailureDialog } from '~/components/deploy/deploy-failure-dialog'
import { RedeploySupabaseTab } from './redeploy-supabase-tab'

export function DeployButton(props: { database: MergedDatabase }) {
  const { user } = useApp()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState('supabase')
  const [isDeploySuccessDialogOpen, setIsDeploySuccessDialogOpen] = useState(false)
  const [isDeployFailureDialogOpen, setIsDeployFailureDialogOpen] = useState(false)
  const [deployInfo, setDeployInfo] = useState<SupabaseDeploymentInfo>()
  const [deployError, setDeployError] = useState<string>()

  useQueryEvent('deploy.start', (params) => {
    const provider = params.get('provider')?.toLowerCase()
    if (provider === 'supabase') {
      setSelectedTab('supabase')
      setIsPopoverOpen(true)
    }
  })

  useQueryEvent('deploy.success', (params) => {
    const deployInfoJson = params.get('project')
    const deployInfo = deployInfoJson ? JSON.parse(deployInfoJson) : undefined
    if (deployInfo) {
      setDeployInfo(deployInfo)
      setIsDeploySuccessDialogOpen(true)
    }
  })

  useQueryEvent('deploy.failure', (params) => {
    const errorMessage = params.get('error')
    if (errorMessage) {
      setDeployError(errorMessage)
      setIsDeployFailureDialogOpen(true)
    }
  })

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="default" size="sm" className="gap-2 opacity-50 cursor-default">
            Deploy <ChevronDown size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sign in to deploy</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
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
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="default" size="sm" className="gap-2">
            Deploy <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="flex p-0 bg-inherit">
              <TabsTrigger value="supabase" className="flex-1 gap-2 data-[state=active]:bg-accent">
                <SupabaseIcon size={14} /> Supabase
              </TabsTrigger>
              <TabsTrigger value="aws" disabled className="flex-1 gap-2">
                <AwsIcon className="text-xl" /> AWS (soon)
              </TabsTrigger>
            </TabsList>
            <SupabaseTab database={props.database} />
          </Tabs>
        </PopoverContent>
      </Popover>
    </>
  )
}

function SupabaseTab(props: { database: MergedDatabase }) {
  const { data: integration, isLoading: isLoadingIntegration } = useIntegrationQuery('Supabase')
  console.log(props.database.deployments)
  const deployment = props.database.deployments.find((d) => d.provider_name === 'Supabase')

  if (isLoadingIntegration) {
    return (
      <TabsContent value="supabase" className="flex flex-col pt-4 mt-4 border-t">
        <Loader
          className="animate-spin self-center justify-self-center"
          size={36}
          strokeWidth={0.75}
        />
      </TabsContent>
    )
  }

  if (!integration) {
    return <ConnectSupabaseTab database={props.database} />
  }

  if (!deployment) {
    return <DeploySupabaseTab database={props.database} />
  }

  return <RedeploySupabaseTab database={props.database} deployment={deployment} />
}

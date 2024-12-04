import { getDatabaseUrl, getPoolerUrl } from '@database.build/deploy/supabase'
import { useRouter } from 'next/navigation'
import { SupabaseDeployInfo, SupabaseDeploymentInfo } from '~/components/deploy/deploy-info'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { TabsContent } from '~/components/ui/tabs'
import { DeployedDatabase } from '~/data/deployed-databases/deployed-databases-query'
import { useIntegrationQuery } from '~/data/integrations/integration-query'
import type { MergedDatabase } from '~/data/merged-databases/merged-database'
import { getDeployUrl } from '~/lib/util'

type SupabaseProject = {
  id: string
  name: string
  pooler: {
    host: string
    name: string
    port: number
    user: string
  }
  region: string
  database: {
    host: string
    name: string
    port: number
    user: string
  }
  createdAt: string
  organizationId: string
}

export function RedeploySupabaseTab(props: {
  database: MergedDatabase
  deployment: DeployedDatabase
}) {
  const router = useRouter()
  const { data: integration, isLoading: isLoadingIntegration } = useIntegrationQuery('Supabase')

  const { project } = props.deployment.provider_metadata as { project: SupabaseProject }

  const projectUrl = `${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL}/dashboard/project/${project.id}`
  const databaseUrl = getDatabaseUrl({ project })
  const poolerUrl = getPoolerUrl({ project })

  const deployInfo: SupabaseDeploymentInfo = {
    name: project.name,
    url: projectUrl,
    databaseUrl,
    poolerUrl,
    createdAt: props.deployment.last_deployment_at
      ? new Date(props.deployment.last_deployment_at)
      : undefined,
  }

  const handleRedeployClick = () => {
    const deployUrl = getDeployUrl({
      databaseId: props.database.id,
      integrationId: integration!.id,
    })

    router.push(deployUrl)
  }

  return (
    <TabsContent value="supabase" className="flex flex-col gap-4">
      <h1 className="text-sm font-semibold mb-1">Redeploy to Supabase</h1>
      <SupabaseDeployInfo info={deployInfo} />
      <Button
        variant="default"
        size="sm"
        className="gap-2 w-full mt-4"
        onClick={handleRedeployClick}
        disabled={isLoadingIntegration}
      >
        <SupabaseIcon size={14} /> Redeploy
      </Button>
    </TabsContent>
  )
}

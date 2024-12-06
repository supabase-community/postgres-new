import { generateProjectName } from '@database.build/deploy/supabase'
import { Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PropsWithChildren } from 'react'
import { SchemaOverlapWarning } from '~/components/deploy/schema-overlap-warning'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { TabsContent } from '~/components/ui/tabs'
import { useIntegrationQuery } from '~/data/integrations/integration-query'
import type { MergedDatabase } from '~/data/merged-databases/merged-database'
import { getDeployUrl } from '~/lib/util'

export function DeploySupabaseTab(props: { database: MergedDatabase }) {
  const router = useRouter()
  const { data: integration, isLoading: isLoadingIntegration } = useIntegrationQuery('Supabase')

  const handleDeployClick = () => {
    const deployUrl = getDeployUrl({
      databaseId: props.database.id,
      integrationId: integration!.id,
    })

    router.push(deployUrl)
  }

  return (
    <TabsContent value="supabase" className="pt-4 mt-4 border-t">
      <h1 className="text-sm font-semibold mb-1">Deploy to Supabase</h1>
      {!integration ? (
        <Loader
          className="animate-spin self-center justify-self-center"
          size={36}
          strokeWidth={0.75}
        />
      ) : (
        <div className="text-sm text-muted-foreground">
          You are about to deploy your in-browser database to Supabase. This will create a new
          Supabase project under your linked organization.
          <DeployCard
            organization={integration.organization}
            projectName={generateProjectName(props.database.id)}
          />
          <SchemaOverlapWarning databaseId={props.database.id} />
        </div>
      )}
      <Button
        variant="default"
        size="sm"
        className="gap-2 w-full mt-4"
        onClick={handleDeployClick}
        disabled={isLoadingIntegration}
      >
        <SupabaseIcon size={14} /> Deploy
      </Button>
    </TabsContent>
  )
}

type DeployCardProps = {
  organization: { id: string; name: string }
  projectName: string
}

function DeployCard({ organization, projectName }: DeployCardProps) {
  return (
    <dl className="text-primary text-sm grid grid-cols-[auto_1fr] gap-4 mt-4">
      <dt className="font-bold">Organization</dt>
      <dd>
        <a
          href={`${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL}/dashboard/org/${organization.id}/general`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {organization.name}
        </a>{' '}
        <span className="text-muted-foreground">({organization.id})</span>
      </dd>
      <dt className="font-bold">Project name</dt>
      <dd>{projectName}</dd>
    </dl>
  )
}

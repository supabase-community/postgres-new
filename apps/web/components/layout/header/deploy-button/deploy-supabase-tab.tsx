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
    <TabsContent value="supabase" className="flex flex-col gap-4">
      <h1 className="text-sm font-semibold mb-1">Deploy to Supabase</h1>
      {!integration ? (
        <Loader
          className="animate-spin self-center justify-self-center"
          size={36}
          strokeWidth={0.75}
        />
      ) : (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
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
    <div className="flex flex-col gap-0 rounded-md my-3 p-1 border border-primary/25 text-primary">
      <DeployCardRow label="Organization">
        <a
          href={`${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL}/dashboard/org/${organization.id}/general`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {organization.name}
        </a>{' '}
        <span className="text-sm italic">({organization.id})</span>
      </DeployCardRow>
      <div className="my-1 border-b border-primary/10" />
      <DeployCardRow label="New project name">{projectName}</DeployCardRow>
    </div>
  )
}

type DeployCardRowProps = PropsWithChildren<{
  label: string
}>

function DeployCardRow({ label, children }: DeployCardRowProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <div className="font-bold w-36 text-right">{label}</div>
      <div className="mx-1 border-r border-primary/10 self-stretch" />
      <div>{children}</div>
    </div>
  )
}

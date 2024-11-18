import { format } from 'date-fns'
import Link from 'next/link'
import { CopyableField } from '~/components/copyable-field'
import { Badge } from '~/components/ui/badge'

export type SupabaseDeploymentInfo = {
  name: string
  url: string
  databasePassword?: string
  databaseUrl: string
  poolerUrl: string
  createdAt?: Date
}

export type DeployInfoProps = {
  info: SupabaseDeploymentInfo
  isRedeploy?: boolean
}

export function SupabaseDeployInfo({ info, isRedeploy = false }: DeployInfoProps) {
  const deployText = isRedeploy ? 'redeployed' : 'deployed'

  return (
    <div className="flex flex-col gap-8">
      <p>
        Your in-browser database was {deployText} to the Supabase project{' '}
        <Link
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4"
          href={info.url}
        >
          {info.name}
        </Link>
        {info.createdAt
          ? ` at ${format(info.createdAt, 'h:mm a')} on ${format(info.createdAt, 'MMMM d, yyyy')}`
          : ''}
        .
      </p>
      <p className="flex flex-col gap-4">
        <CopyableField
          label={
            <>
              Database Connection URL{' '}
              <Badge variant="outline" className="text-muted-foreground">
                IPv6
              </Badge>
            </>
          }
          value={info.databaseUrl}
        />
        <CopyableField
          label={
            <>
              Pooler Connection URL{' '}
              <span className="inline-flex gap-1">
                <Badge variant="outline" className="text-muted-foreground">
                  IPv4
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  IPv6
                </Badge>
              </span>
            </>
          }
          value={info.poolerUrl}
        />
        {info.databasePassword && (
          <>
            <CopyableField label="Database Password" value={info.databasePassword} />
            <span className="text-muted-foreground text-sm">
              Please{' '}
              <span className="text-foreground font-semibold">
                save your database password securely
              </span>{' '}
              as it won&apos;t be displayed again.
            </span>
          </>
        )}
        <span className="text-muted-foreground text-sm">
          You can change your password and learn more about your connection strings in your{' '}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
            href={`${info.url}/settings/database`}
          >
            database settings
          </Link>
          .
        </span>
      </p>
    </div>
  )
}

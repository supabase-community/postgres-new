import { Breadcrumbs } from './breadcrumb'
import { useParams } from 'next/navigation'
import { MenuButton } from './menu-button'
import { CreateDatabaseButton } from './create-database-button'
import { DeployButton } from './deploy-button/deploy-button'
import { LiveShareButton } from './live-share-button'
import { ExtraDatabaseActionsButton } from './extra-database-actions-button'
import ByoLlmButton from '~/components/byo-llm-button'
import { UserAvatar } from './user'
import { useMergedDatabase } from '~/data/merged-databases/merged-database'

export function Header() {
  const { id } = useParams<{ id: string }>()
  const { data: database } = useMergedDatabase(id)

  return (
    <div className="flex p-2 gap-2 border-b bg-popover">
      <div className="-m-2 p-2 border-r mr-2 flex justify-center items-center gap-2">
        <UserAvatar />
        <ByoLlmButton iconOnly size="sm" />
      </div>
      <div className="flex items-center gap-2 flex-1">
        <MenuButton />
        <CreateDatabaseButton />
        <Breadcrumbs database={database} />
      </div>
      {database ? (
        <>
          <LiveShareButton database={database} />
          <DeployButton database={database} />
          <ExtraDatabaseActionsButton database={database} />
        </>
      ) : null}
    </div>
  )
}

import { Breadcrumbs } from './breadcrumb'
import { useDatabaseQuery } from '~/data/databases/database-query'
import { useParams } from 'next/navigation'
import { BringYourOwnLLMButton } from './bring-your-own-llm-button'
import { MenuButton } from './menu-button'
import { ThemeToggleButton } from './toggle-theme-button'
import { CreateDatabaseButton } from './create-database-button'
import { DeployButton } from './deploy-button'
import { LiveShareButton } from './live-share-button'
import { ExtraDatabaseActionsButton } from './extra-database-actions-button'
import ByoLlmButton from '~/components/byo-llm-button'
import { UserAvatar } from './user'

export function Header() {
  const { id } = useParams<{ id: string }>()
  const { data: database } = useDatabaseQuery(id)

  return (
    <div className="flex p-2 gap-2 border-b">
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

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

export function Header() {
  const { id } = useParams<{ id: string }>()
  const { data: database } = useDatabaseQuery(id)

  return (
    <div className="flex p-1 gap-2 border-b">
      <MenuButton />
      <CreateDatabaseButton />
      <Breadcrumbs database={database} />
      <ThemeToggleButton />
      <BringYourOwnLLMButton />
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

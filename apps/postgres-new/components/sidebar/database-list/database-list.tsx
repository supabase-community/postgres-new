import { m } from 'framer-motion'
import { useParams } from 'next/navigation'
import { useLocalDatabasesQuery } from '~/data/local-databases/local-databases-query'
import { useDeployedDatabasesQuery } from '~/data/deployed-databases/deployed-databases-query'
import { DatabaseItem } from './database-item/database-item'
import { Database as DatabaseIcon, Loader } from 'lucide-react'

export type Database = {
  id: string
  name: string
  createdAt: Date
  isHidden: boolean
} & (
  | {
      deployedId: string
      deployedAt: Date
      deployedUrl: string
    }
  | {
      deployedId: undefined
      deployedAt: undefined
      deployedUrl: undefined
    }
)

function useDatabasesQuery() {
  const { data: localDatabases = [], isLoading: isLoadingLocalDatabases } = useLocalDatabasesQuery()
  const { data: deployedDatabases = [], isLoading: isLoadingDeployedDatabases } =
    useDeployedDatabasesQuery()

  const mergedDatabases = localDatabases.map((localDb) => {
    const matchingDeployedDb = deployedDatabases.find(
      (deployedDb) => deployedDb.database_id === localDb.id
    )
    let deployedDatabaseFields = {}
    if (matchingDeployedDb) {
      deployedDatabaseFields = {
        deployedAt: matchingDeployedDb.created_at,
        deployedId: matchingDeployedDb.id,
        deployedUrl: `postgres://readonly_postgres:<your-password>@${localDb.id}.${process.env.NEXT_PUBLIC_WILDCARD_DOMAIN}/postgres`,
      }
    }
    return {
      ...localDb,
      ...deployedDatabaseFields,
    }
  })

  const deployedOnlyDatabases = deployedDatabases
    .filter(
      (deployedDb) => !localDatabases.some((localDb) => localDb.id === deployedDb.database_id)
    )
    .map((deployedDb) => ({
      id: deployedDb.database_id,
      name: deployedDb.name,
      // TODO: persist local database's createdAt field?
      createdAt: new Date(deployedDb.created_at),
      deployedAt: new Date(deployedDb.created_at),
      isHidden: false,
    }))

  const databases = [...mergedDatabases, ...deployedOnlyDatabases].sort((a, b) =>
    a.createdAt > b.createdAt ? 1 : -1
  )

  return {
    databases,
    isLoading: isLoadingLocalDatabases || isLoadingDeployedDatabases,
  } as {
    databases: Database[]
    isLoading: boolean
  }
}

export type DatabaseListProps = {}

export function DatabaseList(props: DatabaseListProps) {
  const { id: currentDatabaseId } = useParams<{ id: string }>()
  const { databases, isLoading: isLoadingDatabases } = useDatabasesQuery()

  if (isLoadingDatabases) {
    return (
      <div className="flex-1 flex flex-col gap-2 my-10 mx-5 items-center text-base text-neutral-400 opacity-75">
        <Loader className="animate-spin" size={48} strokeWidth={0.75} />
      </div>
    )
  }

  if (databases.length === 0) {
    return (
      <div className="flex-1 flex flex-col gap-2 my-10 mx-5 items-center text-base text-neutral-400 opacity-75">
        <DatabaseIcon size={48} strokeWidth={0.75} />
        <span>No databases</span>
      </div>
    )
  }

  return (
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
          <DatabaseItem database={database} isActive={database.id === currentDatabaseId} />
        </m.div>
      ))}
    </m.div>
  )
}

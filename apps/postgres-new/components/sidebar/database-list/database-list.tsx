import { m } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useDatabasesQuery } from '~/data/databases/databases-query'
import { useDeployedDatabasesQuery } from '~/data/deployed-databases/deployed-databases-query'
import { DatabaseItem } from './database-item/database-item'
import { Database as DatabaseIcon, Loader } from 'lucide-react'

export type DatabaseListProps = {}

export function DatabaseList(props: DatabaseListProps) {
  const { id: currentDatabaseId } = useParams<{ id: string }>()
  const { data: databases = [], isLoading: isLoadingDatabases } = useDatabasesQuery()

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

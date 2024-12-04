import { useDatabasesQuery } from '../databases/databases-query'
import { useDeployedDatabasesQuery } from '../deployed-databases/deployed-databases-query'

/**
 * Merges local databases with remote deployed databases.
 */
export function useMergedDatabases() {
  const { data: localDatabases, isLoading: isLoadingLocalDatabases } = useDatabasesQuery()
  const { data: deployedDatabases, isLoading: isLoadingDeployedDatabases } =
    useDeployedDatabasesQuery()

  const isLoading = isLoadingLocalDatabases && isLoadingDeployedDatabases

  if (!localDatabases) {
    return { data: undefined, isLoading }
  }

  const databases = localDatabases.map((db) => ({
    ...db,
    deployments:
      deployedDatabases?.filter((deployedDb) => deployedDb.local_database_id === db.id) ?? [],
  }))

  return { data: databases, isLoading }
}

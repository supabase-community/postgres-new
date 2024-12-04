import { Database } from '~/lib/db'
import {
  DeployedDatabase,
  useDeployedDatabasesQuery,
} from '../deployed-databases/deployed-databases-query'
import { useDatabaseQuery } from '../databases/database-query'

/**
 * A local database with remote deployment information.
 */
export type MergedDatabase = Database & {
  deployments: DeployedDatabase[]
}

/**
 * Merges local database with remote deployed database.
 */
export function useMergedDatabase(id: string) {
  const { data: localDatabase, isLoading: isLoadingLocalDatabase } = useDatabaseQuery(id)
  const { data: deployedDatabases, isLoading: isLoadingDeployedDatabases } =
    useDeployedDatabasesQuery()

  const isLoading = isLoadingLocalDatabase && isLoadingDeployedDatabases

  if (!localDatabase) {
    return { data: undefined, isLoading }
  }

  const database = {
    ...localDatabase,
    deployments:
      deployedDatabases?.filter(
        (deployedDb) => deployedDb.local_database_id === localDatabase.id
      ) ?? [],
  }

  return { data: database, isLoading }
}

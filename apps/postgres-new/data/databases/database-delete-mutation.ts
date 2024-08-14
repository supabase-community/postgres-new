import { useDeployedDatabaseDeleteMutation } from '../deployed-databases/deployed-database-delete-mutation'
import { useLocalDatabaseDeleteMutation } from '../local-databases/local-database-delete-mutation'
import type { Database } from './database-type'

export function useDatabasesDeleteMutation() {
  const { mutateAsync: deleteLocalDatabase, isPending: isDeletingLocalDatabase } =
    useLocalDatabaseDeleteMutation()
  const { mutateAsync: deleteDeployedDatabase, isPending: isDeletingDeployedDatabase } =
    useDeployedDatabaseDeleteMutation()

  async function deleteDatabase(database: Database) {
    await deleteLocalDatabase({ id: database.id })

    if (database.deployment) {
      await deleteDeployedDatabase({ databaseId: database.id })
    }
  }

  return {
    deleteDatabase,
    isLoading: isDeletingLocalDatabase || isDeletingDeployedDatabase,
  }
}

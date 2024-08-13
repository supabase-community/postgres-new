import { useDeployedDatabasesQuery } from '../deployed-databases/deployed-databases-query'
import { useLocalDatabasesQuery } from '../local-databases/local-databases-query'
import { Database, DeployedDatabase } from './database-type'

export function useDatabasesQuery(): { isLoading: boolean; databases: Database[] } {
  const { data: localDatabases = [], isLoading: isLoadingLocalDatabases } = useLocalDatabasesQuery()
  const { data: deployedDatabases = [], isLoading: isLoadingDeployedDatabases } =
    useDeployedDatabasesQuery()

  const mergedDatabases = localDatabases.map((localDb) => {
    const matchingDeployedDb = deployedDatabases.find(
      (deployedDb) => deployedDb.database_id === localDb.id
    )

    if (matchingDeployedDb) {
      return {
        ...localDb,
        deployment: {
          createdAt: new Date(matchingDeployedDb.created_at),
          id: matchingDeployedDb.id,
          url: `postgres://readonly_postgres:<your-password>@${localDb.id}.${process.env.NEXT_PUBLIC_WILDCARD_DOMAIN}/postgres`,
        },
      }
    }

    return localDb
  })

  // TODO: For now we don't show deployed-only databases
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

  const databases = mergedDatabases.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))

  return {
    databases,
    isLoading: isLoadingLocalDatabases || isLoadingDeployedDatabases,
  }
}

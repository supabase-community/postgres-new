import {
  PostgresMetaBase,
  PostgresMetaErr,
  PostgresTable,
  wrapError,
  wrapResult,
} from '@gregnr/postgres-meta/base'
import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useApp } from '~/components/app-provider'
import { DbManager } from '~/lib/db'

export type TablesVariables = {
  databaseId: string
  schemas?: string[]
}
export type TablesData = PostgresTable[]
export type TablesError = PostgresMetaErr['error']

export async function getTablesForQuery(
  dbManager: DbManager | undefined,
  { databaseId, schemas }: TablesVariables
) {
  if (!dbManager) {
    throw new Error('dbManager is not available')
  }

  const db = await dbManager.getDbInstance(databaseId)

  const pgMeta = new PostgresMetaBase({
    query: async (sql) => {
      try {
        const res = await db.query(sql)
        return wrapResult<any[]>(res.rows)
      } catch (error) {
        return wrapError(error, sql)
      }
    },
    end: async () => {},
  })

  const { data, error } = await pgMeta.tables.list({
    includedSchemas: schemas,
    includeColumns: true,
  })

  if (error) {
    throw error
  }

  return data
}

export const useTablesQuery = <TData = TablesData>(
  { databaseId, schemas }: TablesVariables,
  options: Omit<UseQueryOptions<TablesData, TablesError, TData>, 'queryKey' | 'queryFn'> = {}
) => {
  const { dbManager } = useApp()
  return useQuery<TablesData, TablesError, TData>({
    ...options,
    queryKey: getTablesQueryKey({ databaseId, schemas }),
    queryFn: () => getTablesForQuery(dbManager, { databaseId, schemas }),
    staleTime: Infinity,
  })
}

export const getTablesQueryKey = ({ databaseId, schemas }: TablesVariables) => [
  'tables',
  { databaseId, schemas },
]

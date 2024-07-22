import {
  PostgresMetaBase,
  PostgresMetaErr,
  PostgresTable,
  wrapError,
  wrapResult,
} from '@gregnr/postgres-meta/base'
import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { getDb } from '~/lib/db'

export type TablesVariables = {
  databaseId: string
  schemas?: string[]
}
export type TablesData = PostgresTable[]
export type TablesError = PostgresMetaErr['error']

export async function getTablesForQuery({ databaseId, schemas }: TablesVariables) {
  const db = await getDb(databaseId)

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
) =>
  useQuery<TablesData, TablesError, TData>({
    ...options,
    queryKey: getTablesQueryKey({ databaseId, schemas }),
    queryFn: () => getTablesForQuery({ databaseId, schemas }),
    staleTime: Infinity,
  })

export const getTablesQueryKey = ({ databaseId, schemas }: TablesVariables) => [
  'tables',
  { databaseId, schemas },
]

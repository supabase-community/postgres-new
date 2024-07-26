import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { codeBlock } from 'common-tags'
import { Database, getMetaDb } from '~/lib/db'

export async function getDatabase(id: string) {
  const metaDb = await getMetaDb()

  const {
    rows: [database],
  } = await metaDb.query<Database>(
    codeBlock`
      select id, name, created_at as "createdAt", is_hidden as "isHidden"
      from databases
      where id = $1
    `,
    [id]
  )

  return database
}

export const useDatabaseQuery = (
  id: string,
  options: Omit<UseQueryOptions<Database, Error>, 'queryKey' | 'queryFn'> = {}
) =>
  useQuery<Database, Error>({
    ...options,
    queryKey: getDatabaseQueryKey(id),
    queryFn: async () => await getDatabase(id),
    staleTime: Infinity,
  })

export const getDatabaseQueryKey = (id: string) => ['database', id]

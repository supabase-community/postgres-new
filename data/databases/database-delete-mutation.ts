import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { codeBlock } from 'common-tags'
import { Database, deleteDb, getMetaDb } from '~/lib/db'
import { getDatabaseQueryKey } from './database-query'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseDeleteVariables = {
  id: string
}

export const useDatabaseDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error, DatabaseDeleteVariables>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DatabaseDeleteVariables>({
    mutationFn: async ({ id }) => {
      const metaDb = await getMetaDb()

      await metaDb.query<Database>(
        codeBlock`
          delete from databases
          where id = $1
        `,
        [id]
      )

      await deleteDb(id)
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getDatabasesQueryKey() })])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDatabaseQueryKey(variables.id) }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

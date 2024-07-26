import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { codeBlock } from 'common-tags'
import { Database, getMetaDb } from '~/lib/db'
import { getDatabaseQueryKey } from './database-query'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseUpdateVariables = {
  id: string
  name: string | null
  isHidden: boolean
}

export const useDatabaseUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<Database, Error, DatabaseUpdateVariables>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<Database, Error, DatabaseUpdateVariables>({
    mutationFn: async ({ id, name, isHidden }) => {
      const metaDb = await getMetaDb()

      const {
        rows: [database],
      } = await metaDb.query<Database>(
        codeBlock`
          update databases
          set name = $2, is_hidden = $3
          where id = $1
          returning id, name, created_at as "createdAt"
        `,
        [id, name, isHidden]
      )

      return database
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

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { generateId } from 'ai'
import { codeBlock } from 'common-tags'
import { Database, getMetaDb } from '~/lib/db'
import { getDatabasesQueryKey } from './databases-query'

export type DatabaseCreateVariables = {
  id?: string
  isHidden?: boolean
}

export const useDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<Database, Error, DatabaseCreateVariables>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<Database, Error, DatabaseCreateVariables>({
    mutationFn: async ({ id = generateId(12), isHidden }) => {
      const metaDb = await getMetaDb()

      const {
        rows: [database],
      } = await metaDb.query<Database>(
        codeBlock`
          insert into databases (id, is_hidden)
          values ($1, $2)
          on conflict (id) do nothing
          returning id, name, created_at as "createdAt", is_hidden as "isHidden"
        `,
        [id, isHidden]
      )

      return database
    },
    async onSuccess(data, variables, context) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: getDatabasesQueryKey() })])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

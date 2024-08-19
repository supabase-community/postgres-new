import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { getDeployedDatabasesQueryKey } from './deployed-databases-query'
import { useApp } from '~/components/app-provider'
import type { DatabaseUploadResponse } from '~/app/api/databases/[id]/upload/route'
import { getUncompressedSizeInMB } from '~/utils/get-uncompressed-size-in-mb'

export type DeployedDatabaseCreateVariables = {
  databaseId: string
  name: string | null
  createdAt: Date
}

export type DeployedDatabaseCreateResult = Extract<
  DatabaseUploadResponse,
  { success: true }
>['data']

export const useDeployedDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<DeployedDatabaseCreateResult, Error, DeployedDatabaseCreateVariables>,
  'mutationFn'
> = {}) => {
  const { dbManager } = useApp()
  const queryClient = useQueryClient()

  return useMutation<DeployedDatabaseCreateResult, Error, DeployedDatabaseCreateVariables>({
    mutationFn: async (variables) => {
      if (!dbManager) {
        throw new Error('No dbManager')
      }

      const db = await dbManager.getDbInstance(variables.databaseId)

      const dump = await db.dumpDataDir('gzip')
      if ((await getUncompressedSizeInMB(dump)) > 100) {
        throw new Error("You can't deploy a database that is bigger than 100MB")
      }
      const formData = new FormData()
      formData.append('dump', dump, 'dump.tar.gz')
      formData.append('name', variables.name ?? 'My database')
      formData.append('created_at', variables.createdAt.toISOString())

      const response = await fetch(`/api/databases/${variables.databaseId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as DatabaseUploadResponse

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    },
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDeployedDatabasesQueryKey() }),
      ])
      return onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export async function zip(file: Blob | File): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  const reader = cs.readable.getReader()

  writer.write(file)
  writer.close()

  const chunks: Uint8Array[] = []

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
  let offset = 0
  chunks.forEach((chunk) => {
    compressed.set(chunk, offset)
    offset += chunk.length
  })

  return compressed
}

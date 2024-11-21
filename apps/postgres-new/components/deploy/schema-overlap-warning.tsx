import { SUPABASE_SCHEMAS } from '@database.build/deploy/supabase'
import { Results } from '@electric-sql/pglite'
import { sql } from '@electric-sql/pglite/template'
import { join } from '~/lib/db'
import { useAsyncMemo } from '~/lib/hooks'
import { useApp } from '../app-provider'
import { Loader } from 'lucide-react'

export type SchemaOverlapWarningProps = {
  databaseId: string
}

export function SchemaOverlapWarning({ databaseId }: SchemaOverlapWarningProps) {
  const { dbManager } = useApp()

  const { value: overlappingSchemas, loading: isLoadingSchemas } = useAsyncMemo(async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }

    const db = await dbManager.getDbInstance(databaseId)

    console.log(SUPABASE_SCHEMAS)

    const { rows }: Results<{ schema_name: string }> = await db.sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN (${join(
        SUPABASE_SCHEMAS.map((s) => sql`${s}`),
        ','
      )})
      `

    return rows.map((row) => row.schema_name)
  }, [databaseId])

  if (isLoadingSchemas || !overlappingSchemas) {
    return (
      <Loader
        className="animate-spin self-center justify-self-center my-4"
        size={36}
        strokeWidth={0.75}
      />
    )
  }

  if (overlappingSchemas.length > 0) {
    return (
      <div className="flex flex-col gap-2 rounded-md border-destructive bg-destructive/25 p-4 mb-2">
        The following Supabase schemas were detected in your browser database and will be excluded
        from the deployment:
        <div className="prose text-sm">
          <ul className="my-0">
            {overlappingSchemas.map((schema) => (
              <li key={schema} className="my-0">
                <code>{schema}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return null
}

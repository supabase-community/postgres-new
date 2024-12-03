import { useMemo } from 'react'
import { formatSql } from '~/lib/sql-util'
import { ToolInvocation } from '~/lib/tools'
import CodeAccordion from '../code-accordion'

export type SqlImportProps = {
  toolInvocation: ToolInvocation<'importSql'>
}

export default function SqlImport({ toolInvocation }: SqlImportProps) {
  const { fileId, sql } = toolInvocation.args

  const formattedSql = useMemo(() => formatSql(sql), [sql])

  if (!('result' in toolInvocation)) {
    return null
  }

  const { result } = toolInvocation

  if (!result.success) {
    return (
      <CodeAccordion
        title="Error executing SQL"
        language="sql"
        code={formattedSql ?? sql}
        error={result.error}
      />
    )
  }

  return <CodeAccordion title="Executed SQL" language="sql" code={formattedSql ?? sql} />
}

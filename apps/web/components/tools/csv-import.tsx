import { ToolInvocation } from '~/lib/tools'
import CodeAccordion from '../code-accordion'
import { useMemo } from 'react'
import { format } from 'sql-formatter'

export type CsvExportProps = {
  toolInvocation: ToolInvocation<'importCsv'>
}

export default function CsvImport({ toolInvocation }: CsvExportProps) {
  const { sql } = toolInvocation.args

  const formattedSql = useMemo(
    () =>
      format(sql, {
        language: 'postgresql',
        keywordCase: 'lower',
        identifierCase: 'lower',
        dataTypeCase: 'lower',
        functionCase: 'lower',
      }),
    [sql]
  )

  if (!('result' in toolInvocation)) {
    return null
  }

  const { result } = toolInvocation

  if (!result.success) {
    return (
      <CodeAccordion
        title="Error executing SQL"
        language="sql"
        code={formattedSql}
        error={result.error}
      />
    )
  }

  return <CodeAccordion title="Executed SQL" language="sql" code={formattedSql} />
}

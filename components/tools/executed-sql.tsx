import { useMemo } from 'react'
import { format } from 'sql-formatter'
import { ToolInvocation } from '~/lib/tools'
import CodeAccordion from '../code-accordion'

export type ExecutedSqlProps = {
  toolInvocation: ToolInvocation<'executeSql'>
}

export default function ExecutedSql({ toolInvocation }: ExecutedSqlProps) {
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

  if (!toolInvocation.result.success) {
    return <div className="bg-destructive-300 px-6 py-4 rounded-md">Error executing SQL</div>
  }

  return <CodeAccordion title="Executed SQL" language="sql" code={formattedSql} />
}

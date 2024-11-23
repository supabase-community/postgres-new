import { Workflow } from 'lucide-react'
import { useMemo } from 'react'
import { useAsyncMemo } from '~/lib/hooks'
import { assertDefined, formatSql, isMigrationStatement } from '~/lib/sql-util'
import { ToolInvocation } from '~/lib/tools'
import CodeAccordion from '../code-accordion'
import { useWorkspace } from '../workspace'

export type ExecutedSqlProps = {
  toolInvocation: ToolInvocation<'executeSql'>
}

export default function ExecutedSql({ toolInvocation }: ExecutedSqlProps) {
  const { sql } = toolInvocation.args

  const { setTab } = useWorkspace()
  const formattedSql = useMemo(() => formatSql(sql), [sql])

  const { value: containsMigration } = useAsyncMemo(async () => {
    // Dynamically import (browser-only) to prevent SSR errors
    const { parseQuery } = await import('libpg-query/wasm')

    const parseResult = await parseQuery(sql)
    assertDefined(parseResult.stmts, 'Expected stmts to exist in parse result')

    return parseResult.stmts.some(isMigrationStatement)
  }, [sql])

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

  return (
    <div className="flex flex-col gap-2">
      <CodeAccordion title="Executed SQL" language="sql" code={formattedSql ?? sql} />
      {containsMigration && (
        <div className="lg:hidden text-xs text-primary/50 flex gap-2 self-end">
          <div
            className="flex flex-row items-center gap-[0.125rem] underline cursor-pointer"
            onClick={() => {
              setTab('diagram')
            }}
          >
            <Workflow size={12} />
            See diagram
          </div>
        </div>
      )}
    </div>
  )
}

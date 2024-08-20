import { m } from 'framer-motion'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { format } from 'sql-formatter'
import { loadFile } from '~/lib/files'
import { ToolInvocation } from '~/lib/tools'
import { downloadFile } from '~/lib/util'
import CodeAccordion from '../code-accordion'

export type CsvExportProps = {
  toolInvocation: ToolInvocation<'exportCsv'>
}

export default function CsvExport({ toolInvocation }: CsvExportProps) {
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

  return (
    <>
      <CodeAccordion title="Executed SQL" language="sql" code={formattedSql} />
      <m.div
        layoutId={toolInvocation.toolCallId}
        className="self-start px-5 py-2.5 text-base rounded-full bg-border flex gap-2 items-center text-lighter italic"
        style={{
          // same value as tailwind, used to keep constant radius during framer animation
          // see: https://www.framer.com/motion/layout-animations/##scale-correction
          borderRadius: 9999,
        }}
      >
        <Download size={14} />
        <m.span
          className="cursor-pointer hover:underline"
          layout
          onClick={async () => {
            const file = await loadFile(result.fileId)
            downloadFile(file)
          }}
        >
          {result.file.name}
        </m.span>
      </m.div>
    </>
  )
}

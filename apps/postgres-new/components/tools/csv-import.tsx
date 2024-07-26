import { ToolInvocation } from '~/lib/tools'
import CodeAccordion from '../code-accordion'

export type CsvExportProps = {
  toolInvocation: ToolInvocation<'importCsv'>
}

export default function CsvImport({ toolInvocation }: CsvExportProps) {
  if (!('result' in toolInvocation)) {
    return null
  }

  const { result } = toolInvocation

  if (!result.success) {
    return <div className="bg-destructive-300 px-6 py-4 rounded-md">Error executing SQL</div>
  }

  return <CodeAccordion title="Executed SQL" language="sql" code={toolInvocation.args.sql} />
}

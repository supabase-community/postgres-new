import { ToolInvocation } from '~/lib/tools'
import ConversationRename from './conversation-rename'
import CsvExport from './csv-export'
import CsvImport from './csv-import'
import CsvRequest from './csv-request'
import ExecutedSql from './executed-sql'
import GeneratedChart from './generated-chart'
import GeneratedEmbedding from './generated-embedding'

export type ToolUiProps = {
  toolInvocation: ToolInvocation
}

export function ToolUi({ toolInvocation }: ToolUiProps) {
  switch (toolInvocation.toolName) {
    case 'executeSql':
      return <ExecutedSql toolInvocation={toolInvocation} />
    case 'generateChart':
      return <GeneratedChart toolInvocation={toolInvocation} />
    case 'requestCsv':
      return <CsvRequest toolInvocation={toolInvocation} />
    case 'importCsv':
      return <CsvImport toolInvocation={toolInvocation} />
    case 'exportCsv':
      return <CsvExport toolInvocation={toolInvocation} />
    case 'renameConversation':
      return <ConversationRename toolInvocation={toolInvocation} />
    case 'embed':
      return <GeneratedEmbedding toolInvocation={toolInvocation} />
  }
  return null
}

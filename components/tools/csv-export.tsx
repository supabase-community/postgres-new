import { m } from 'framer-motion'
import { Download } from 'lucide-react'
import { loadFile } from '~/lib/files'
import { ToolInvocation } from '~/lib/tools'
import { downloadFile } from '~/lib/util'
import CodeAccordion from '../code-accordion'

export type CsvExportProps = {
  toolInvocation: ToolInvocation<'exportCsv'>
}

export default function CsvExport({ toolInvocation }: CsvExportProps) {
  if (!('result' in toolInvocation)) {
    return null
  }

  const { result } = toolInvocation

  if (!result.success) {
    return <div className="bg-destructive-300 px-6 py-4 rounded-md">Error executing SQL</div>
  }

  return (
    <>
      <CodeAccordion title="Executed SQL" language="sql" code={toolInvocation.args.sql} />
      <m.div
        layoutId={toolInvocation.toolCallId}
        className="self-start px-5 py-2.5 text-base rounded-full bg-green-300 flex gap-2 items-center text-lighter italic"
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

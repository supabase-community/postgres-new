import { generateId } from 'ai'
import { useChat } from 'ai/react'
import { m } from 'framer-motion'
import { Paperclip } from 'lucide-react'
import { loadFile, saveFile } from '~/lib/files'
import { ToolInvocation } from '~/lib/tools'
import { downloadFile } from '~/lib/util'
import { useWorkspace } from '../workspace'

export type CsvRequestProps = {
  toolInvocation: ToolInvocation<'requestCsv'>
}

export default function CsvRequest({ toolInvocation }: CsvRequestProps) {
  const { databaseId } = useWorkspace()

  const { addToolResult } = useChat({
    id: databaseId,
    api: '/api/chat',
  })

  if ('result' in toolInvocation) {
    const { result } = toolInvocation

    if (!result.success) {
      return (
        <m.div
          layout="position"
          layoutId={toolInvocation.toolCallId}
          className="self-end px-5 py-2.5 text-base rounded-full bg-destructive flex gap-2 items-center text-lighter italic"
        >
          No CSV file selected
        </m.div>
      )
    }

    return (
      <m.div
        layout="position"
        layoutId={toolInvocation.toolCallId}
        className="self-end px-5 py-2.5 text-base rounded-full bg-border flex gap-2 items-center text-lighter italic"
        style={{
          // same value as tailwind, used to keep constant radius during framer animation
          // see: https://www.framer.com/motion/layout-animations/##scale-correction
          borderRadius: 9999,
        }}
      >
        <Paperclip size={14} />
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
    )
  }

  return (
    <m.div layout="position" layoutId={toolInvocation.toolCallId}>
      <input
        type="file"
        onChange={async (e) => {
          if (e.target.files) {
            try {
              const [file] = Array.from(e.target.files)

              if (!file) {
                throw new Error('No file found')
              }

              if (file.type !== 'text/csv') {
                throw new Error('File is not a CSV')
              }

              const fileId = generateId()

              await saveFile(fileId, file)

              const text = await file.text()

              addToolResult({
                toolCallId: toolInvocation.toolCallId,
                result: {
                  success: true,
                  fileId: fileId,
                  file: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                  },
                  preview: text.split('\n').slice(0, 4).join('\n').trim(),
                },
              })
            } catch (error) {
              addToolResult({
                toolCallId: toolInvocation.toolCallId,
                result: {
                  success: false,
                  error: error instanceof Error ? error.message : 'An unknown error occurred',
                },
              })
            }
          }
        }}
      />
    </m.div>
  )
}

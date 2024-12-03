import { ToolInvocation } from '~/lib/tools'
import { useApp } from '../app-provider'
import { useWorkspace } from '../workspace'

export type CsvRequestProps = {
  toolInvocation: ToolInvocation<'renameConversation'>
}

export default function ConversationRename({ toolInvocation }: CsvRequestProps) {
  const { user } = useApp()
  const { appendMessage } = useWorkspace()

  if (!('result' in toolInvocation)) {
    return null
  }

  const { args, result } = toolInvocation

  if (!result.success) {
    // TODO: show error to the user
    return (
      <div className="bg-destructive-300 px-6 py-4 rounded-md">Error renaming conversation</div>
    )
  }

  const { name } = args

  return (
    <div className="self-stretch my-4 text-xs flex gap-3 justify-center items-center text-neutral-400 before:h-[1px] before:flex-grow before:bg-neutral-300 after:h-[1px] after:flex-grow after:bg-neutral-300">
      <div>
        <span>Conversation renamed to</span> <strong>{name}</strong>{' '}
        {user && (
          <span
            className="underline cursor-pointer hover:no-underline"
            onClick={() => {
              appendMessage({
                role: 'user',
                content: "Let's rename the conversation. Any suggestions?",
              })
            }}
          >
            change
          </span>
        )}
      </div>
    </div>
  )
}

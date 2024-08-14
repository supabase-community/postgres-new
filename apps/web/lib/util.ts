import { CreateMessage, generateId, Message } from 'ai'

/**
 * Programmatically download a `File`.
 */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Ensures that a `Message` has an `id` by generating one if it
 * doesn't exist.
 */
export function ensureMessageId(message: Message | CreateMessage): asserts message is Message {
  if (!('id' in message)) {
    message.id = generateId()
  }
}

/**
 * Ensures that all tool invocations have a result before submitting,
 * otherwise the LLM provider will return an error.
 */
export function ensureToolResult(messages: Message[]) {
  let modified = false

  for (const message of messages) {
    if (!message.toolInvocations) {
      continue
    }

    for (const toolInvocation of message.toolInvocations) {
      if (!('result' in toolInvocation)) {
        Object.assign(toolInvocation, {
          result: {
            success: false,
            error: 'Failed to complete',
          },
        })
        modified = true
      }
    }
  }

  return modified
}

/**
 * Checks if the message is a user message sent by the
 * application instead of the user.
 *
 * _(eg. renaming database at start of conversation)_
 */
export function isAutomatedUserMessage(message: Message) {
  return (
    message.role === 'user' &&
    typeof message.data === 'object' &&
    message.data !== null &&
    'automated' in message.data &&
    message.data.automated === true
  )
}

export function titleToKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\s]+/g, '-') // Replace spaces and underscores with dashes
    .replace(/[^a-z0-9-]/g, '') // Remove any non-alphanumeric characters except dashes
    .replace(/-+/g, '-') // Replace multiple dashes with a single dash
    .replace(/^-|-$/g, '') // Remove leading and trailing dashes
}

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

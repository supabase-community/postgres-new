import { codeBlock } from 'common-tags'
import { ToolInvocation } from '~/lib/tools'
import MarkdownAccordion from '../markdown-accordion'

export type GeneratedEmbeddingProps = {
  toolInvocation: ToolInvocation<'embed'>
}

export default function GeneratedEmbedding({ toolInvocation }: GeneratedEmbeddingProps) {
  const { texts } = toolInvocation.args

  if (!('result' in toolInvocation)) {
    return null
  }

  if (!toolInvocation.result.success) {
    const content = codeBlock`
      ${texts.map((text) => `> ${text}`).join('\n')}
    `

    return (
      <MarkdownAccordion
        title="Error generating embedding"
        content={content}
        error={toolInvocation.result.error}
      />
    )
  }

  const { ids } = toolInvocation.result

  const content = codeBlock`
    Results stored in \`meta.embeddings\` table:

    ${texts.map((text, i) => `- **\`id\`:** ${ids[i]}\n\n  **\`content\`:** ${text}`).join('\n')}
  `

  return <MarkdownAccordion title="Generated embedding" content={content} />
}

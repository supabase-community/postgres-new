import { DatabaseZap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { cn } from '~/lib/utils'

export type MarkdownAccordionProps = {
  title: string
  content: string
  error?: string
  className?: string
}

export default function MarkdownAccordion({
  title,
  content,
  error,
  className,
}: MarkdownAccordionProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="item-1"
        className={cn(
          'border-2 border-neutral-100 bg-neutral-50 px-3 py-2 rounded-md',
          error ? 'bg-destructive-300' : undefined,
          className
        )}
      >
        <AccordionTrigger className="p-0 gap-2">
          <div className="flex gap-2 items-center font-normal text-lighter text-sm">
            <DatabaseZap size={14} />
            {title}
          </div>
        </AccordionTrigger>
        <AccordionContent className="py-2 [&_>div]:pb-0 flex flex-col gap-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose text-xs mt-2 [&_ul>li::before]:top-2 [&_ol>li::before]:top-0"
          >
            {content}
          </ReactMarkdown>
          {error && <div className="text-destructive-600 text-xs">{error}</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

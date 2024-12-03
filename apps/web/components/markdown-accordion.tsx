import { CircleX, Move3D } from 'lucide-react'
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
          'border rounded-md overflow-hidden',
          error ? 'border-destructive' : undefined,
          className
        )}
      >
        <AccordionTrigger
          className={cn(
            'p-0 gap-2 px-3 py-2',
            error
              ? 'bg-destructive border-destructive [&_svg]:text-destructive-foreground'
              : undefined
          )}
        >
          <div className="flex gap-2 items-center font-normal text-lighter text-sm">
            {error ? (
              <CircleX
                size={14}
                className={cn('text-muted-foreground', error && 'text-destructive-foreground')}
              />
            ) : (
              <Move3D
                size={14}
                className={cn('text-muted-foreground', error && 'text-destructive-foreground')}
              />
            )}
            <span className={cn(error ? 'text-destructive-foreground' : undefined)}>{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="py-2 [&_>div]:pb-0 flex flex-col gap-2 bg-background px-3">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose text-xs mt-2 [&_ul>li::before]:top-2 [&_ol>li::before]:top-0"
          >
            {content}
          </ReactMarkdown>
          {error && <div className="text-red-600 text-xs">{error}</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

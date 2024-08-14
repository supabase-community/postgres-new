import { CircleX, DatabaseZap } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { cn } from '~/lib/utils'
import { CodeBlock } from './code-block'

export type CodeAccordionProps = {
  title: string
  language: 'sql'
  code: string
  error?: string
  className?: string
}

export default function CodeAccordion({
  title,
  language,
  code,
  error,
  className,
}: CodeAccordionProps) {
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
              <DatabaseZap
                size={14}
                className={cn('text-muted-foreground', error && 'text-destructive-foreground')}
              />
            )}
            <span className={cn(error ? 'text-destructive-foreground' : undefined)}>{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="py-2 [&_>div]:pb-0 flex flex-col gap-2 bg-background px-3">
          <CodeBlock
            className={cn(`language-${language}`, 'border-none px-0 pb-4 !bg-inherit')}
            hideLineNumbers
            hideCopy
          >
            {code}
          </CodeBlock>
          {error && <div className="text-red-600 text-xs">{error}</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

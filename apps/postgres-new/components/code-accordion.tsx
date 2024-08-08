import { DatabaseZap } from 'lucide-react'
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
          'border bg-muted px-3 py-2 rounded-md',
          error ? 'bg-destructive text-destructive-foreground' : undefined,
          className
        )}
      >
        <AccordionTrigger className="p-0 gap-2">
          <div className="flex gap-2 items-center font-normal text-lighter text-sm">
            <DatabaseZap size={14} className="text-muted-foreground" />
            {title}
          </div>
        </AccordionTrigger>
        <AccordionContent className="py-2 [&_>div]:pb-0 flex flex-col gap-2">
          <CodeBlock
            className={cn(`language-${language}`, 'border-none px-0 pb-4 !bg-inherit')}
            hideLineNumbers
            hideCopy
          >
            {code}
          </CodeBlock>
          {error && <div className="text-destructive text-xs">{error}</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

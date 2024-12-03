import { PackagePlusIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export function CreateDatabaseButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="default" size="sm" asChild>
          <Link href="/">
            <PackagePlusIcon size={14} />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>New database</TooltipContent>
    </Tooltip>
  )
}

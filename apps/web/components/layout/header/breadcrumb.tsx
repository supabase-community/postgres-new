import { CheckIcon, PenIcon, XIcon } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '../../ui/breadcrumb'
import { Button } from '~/components/ui/button'
import Link from 'next/link'
import { Input } from '~/components/ui/input'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { MergedDatabase } from '~/data/merged-databases/merged-database'

export function Breadcrumbs(props: { database?: MergedDatabase }) {
  const [isRenaming, setIsRenaming] = useState(false)
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const name = formData.get('name') as string
    if (name.length === 0) {
      setIsRenaming(false)
      return
    }
    await updateDatabase({ ...props.database!, name })
    setIsRenaming(false)
  }

  return (
    <Breadcrumb className="flex-1 items-center ml-2 hidden md:flex">
      <BreadcrumbList className="flex items-center">
        {props.database ? (
          <BreadcrumbItem>
            {isRenaming ? (
              <form
                id="rename-database-form"
                onSubmit={handleSubmit}
                className="flex items-center gap-1 border rounded-md pr-1"
              >
                <Input
                  className="h-9 focus-visible:ring-0 border-none focus-visible:ring-offset-0"
                  autoFocus
                  defaultValue={props.database!.name ?? 'My database'}
                  name="name"
                  ref={(input) => input?.select()}
                />
                <CancelRenameDatabaseButton onClick={() => setIsRenaming(false)} />
                <SubmitRenameDatabaseButton />
              </form>
            ) : (
              <>
                <BreadcrumbLink asChild>
                  <Link className="text-foreground" href={`/db/${props.database.id}`}>
                    {props.database.name}
                  </Link>
                </BreadcrumbLink>
                <RenameDatabaseButton onClick={() => setIsRenaming(true)} />
              </>
            )}
          </BreadcrumbItem>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function RenameDatabaseButton(props: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={props.onClick}>
          <PenIcon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Rename database</TooltipContent>
    </Tooltip>
  )
}

function SubmitRenameDatabaseButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          className="w-6 h-6 shrink-0"
          size="icon"
          type="submit"
          form="rename-database-form"
        >
          <CheckIcon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Save</TooltipContent>
    </Tooltip>
  )
}

function CancelRenameDatabaseButton(props: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 shrink-0" size="icon" onClick={props.onClick}>
          <XIcon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Cancel</TooltipContent>
    </Tooltip>
  )
}

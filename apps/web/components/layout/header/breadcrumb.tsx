import { CheckIcon, PenIcon, UserIcon, XIcon } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../../ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { useApp } from '~/components/app-provider'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import Link from 'next/link'
import GitHubIcon from '~/assets/github-icon'
import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Database } from '~/lib/db'
import { Input } from '~/components/ui/input'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'

export function Breadcrumbs(props: { database?: Database }) {
  const { user } = useApp()
  const [isRenaming, setIsRenaming] = useState(false)
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const avatarUrl = user?.user_metadata.avatar_url ?? null
  const username = user?.user_metadata.user_name ?? null

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
    <Breadcrumb className="flex-1 flex items-center">
      <BreadcrumbList className="flex items-center">
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar asChild className="w-8 h-8 border-2 border-accent">
                <Button variant="ghost" size="icon">
                  <AvatarImage src={avatarUrl} alt={username} />
                  <AvatarFallback>
                    <UserIcon />
                  </AvatarFallback>
                </Button>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>{user ? <SignOutButton /> : <SignInButton />}</DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        {props.database ? <BreadcrumbSeparator>/</BreadcrumbSeparator> : null}
        {props.database ? (
          <BreadcrumbItem>
            {isRenaming ? (
              <form id="rename-database-form" onSubmit={handleSubmit}>
                <Input
                  className="h-8 focus-visible:ring-1"
                  autoFocus
                  defaultValue={props.database!.name ?? 'My database'}
                  name="name"
                  ref={(input) => input?.select()}
                />
              </form>
            ) : (
              <BreadcrumbLink asChild>
                <Link className="text-foreground" href={`/db/${props.database.id}`}>
                  {props.database.name}
                </Link>
              </BreadcrumbLink>
            )}
            {isRenaming ? (
              <div className="flex gap-2">
                <CancelRenameDatabaseButton onClick={() => setIsRenaming(false)} />
                <SubmitRenameDatabaseButton />
              </div>
            ) : (
              <RenameDatabaseButton onClick={() => setIsRenaming(true)} />
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

function SignInButton() {
  const { signIn } = useApp()
  return (
    <DropdownMenuItem
      className="gap-2"
      onClick={() => {
        signIn()
      }}
    >
      <GitHubIcon className="text-xl" />
      Sign in with GitHub
    </DropdownMenuItem>
  )
}

function SignOutButton() {
  const { signOut } = useApp()
  return (
    <DropdownMenuItem
      className="gap-2"
      onClick={() => {
        signOut()
      }}
    >
      <GitHubIcon className="text-xl" />
      Sign out
    </DropdownMenuItem>
  )
}

function SubmitRenameDatabaseButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="default" size="sm" type="submit" form="rename-database-form">
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
        <Button variant="ghost" size="sm" onClick={props.onClick}>
          <XIcon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Cancel</TooltipContent>
    </Tooltip>
  )
}

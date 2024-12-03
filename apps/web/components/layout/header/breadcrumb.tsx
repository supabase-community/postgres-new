import { PenIcon, Slash, UserIcon } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../../ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { useApp } from '~/components/app-provider'
import { useParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { useDatabaseQuery } from '~/data/databases/database-query'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import GitHubIcon from '~/assets/github-icon'
import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

export function Breadcrumbs() {
  const params = useParams<{ id: string }>()
  const { data: database } = useDatabaseQuery(params.id)
  const { user } = useApp()

  const avatarUrl = user?.user_metadata.avatar_url ?? null
  const username = user?.user_metadata.user_name ?? null

  return (
    <Breadcrumb className="flex-1 flex items-center">
      <BreadcrumbList className="flex items-center">
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar asChild className="w-8 h-8 border-2 border-input">
                <Button variant="ghost" size="icon">
                  <AvatarImage src={avatarUrl} alt={username} />
                  <AvatarFallback>
                    <UserIcon />
                  </AvatarFallback>
                </Button>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="gap-2">
                <GitHubIcon className="text-xl" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        {database ? <BreadcrumbSeparator>/</BreadcrumbSeparator> : null}
        {database ? (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/db/${params.id}`}>{database.name}</Link>
            </BreadcrumbLink>
            <Button variant="ghost" size="sm">
              <PenIcon size={14} />
            </Button>
          </BreadcrumbItem>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

import { UserIcon, SunIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { useApp } from '~/components/app-provider'
import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '~/components/ui/dropdown-menu'
import GitHubIcon from '~/assets/github-icon'
import { useTheme } from 'next-themes'

export function UserAvatar() {
  const { user, signIn } = useApp()

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => signIn()}>
        <GitHubIcon className="text-xl" />
        Sign in
      </Button>
    )
  }

  const { theme, setTheme } = useTheme()
  const avatarUrl = user.user_metadata.avatar_url ?? null
  const username = user.user_metadata.user_name ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar asChild className="w-9 h-9 rounded-md border">
          <Button variant="ghost" size="icon">
            <AvatarImage src={avatarUrl} alt={username} />
            <AvatarFallback>
              <UserIcon />
            </AvatarFallback>
          </Button>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="bottom" align="start">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <SunIcon size={14} />
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <SignOutButton />
      </DropdownMenuContent>
    </DropdownMenu>
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

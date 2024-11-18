'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { cn } from '~/lib/utils'

export type ThemeDropdownProps = {
  iconOnly?: boolean
  className?: string
}

export default function ThemeDropdown({ iconOnly = false, className }: ThemeDropdownProps) {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('gap-2', className)}
          size={iconOnly ? 'icon' : undefined}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 transition-all dark:-rotate-90 dark:hidden" />
          <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 hidden transition-all dark:rotate-0 dark:block" />
          {!iconOnly && <span>Toggle theme</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

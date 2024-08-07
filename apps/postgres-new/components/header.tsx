'use client'

import { useTheme } from 'next-themes'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Moon, Sun } from 'lucide-react'

export default function Header() {
  const { setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-background border-b">
      <div className="flex gap-2 items-center">
        <h1 className="text-sm">postgres.new</h1>
        <span className="text-lightgray">/</span>
        <span className="text-sm">Name of database</span>
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <a href="" />
          </li>
        </ul>
        {/* <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>User</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Something</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  )
}

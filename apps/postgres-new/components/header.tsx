import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-gray-800 text-white">
      <div className="flex gap-2">
        <h1 className="text-base font-bold">postgres.new</h1>/<h2>Name of database</h2>
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <a href="" />
          </li>
        </ul>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button>User</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Something</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  )
}

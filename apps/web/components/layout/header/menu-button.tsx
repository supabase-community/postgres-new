import { MenuIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'

export function MenuButton() {
  return (
    <Button variant="ghost" size="sm">
      <MenuIcon size={14} />
    </Button>
  )
}

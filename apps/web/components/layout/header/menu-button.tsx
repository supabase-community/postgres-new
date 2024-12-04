import { MenuIcon } from 'lucide-react'
import { useApp } from '~/components/app-provider'
import Sidebar from '~/components/sidebar'
import { Button } from '~/components/ui/button'

export function MenuButton() {
  const { showSidebar, setShowSidebar } = useApp()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
        <MenuIcon size={14} />
      </Button>
    </>
  )
}

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useLocalDatabaseDeleteMutation } from '~/data/local-databases/local-database-delete-mutation'
import { LocalDatabase } from '~/lib/db'

export type DatabaseItemDeleteActionProps = { database: LocalDatabase; isActive: boolean }

export function DatabaseItemDeleteAction(props: DatabaseItemDeleteActionProps) {
  const router = useRouter()
  const { mutateAsync: deleteDatabase } = useLocalDatabaseDeleteMutation()

  async function handleMenuItemSelect(e: Event) {
    await deleteDatabase({ id: props.database.id })

    if (props.isActive) {
      router.push('/')
    }
  }

  return (
    <DropdownMenuItem className="gap-3" onSelect={handleMenuItemSelect}>
      <Trash2 size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      <span>Delete</span>
    </DropdownMenuItem>
  )
}
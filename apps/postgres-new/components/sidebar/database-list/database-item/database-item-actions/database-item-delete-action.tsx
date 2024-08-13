import { Loader, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useDatabasesDeleteMutation } from '~/data/databases/database-delete-mutation'
import { Database } from '~/data/databases/database-type'

export type DatabaseItemDeleteActionProps = { database: Database; isActive: boolean }

export function DatabaseItemDeleteAction(props: DatabaseItemDeleteActionProps) {
  const router = useRouter()
  const { deleteDatabase, isLoading: isDeleting } = useDatabasesDeleteMutation()

  async function handleDelete() {
    await deleteDatabase(props.database)

    if (props.isActive) {
      router.push('/')
    }
  }

  return (
    <DropdownMenuItem className="gap-3" onSelect={handleDelete}>
      {isDeleting ? (
        <Loader
          className="animate-spin flex-shrink-0 text-muted-foreground"
          size={16}
          strokeWidth={2}
        />
      ) : (
        <Trash2 size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      )}

      <span>Delete</span>
    </DropdownMenuItem>
  )
}

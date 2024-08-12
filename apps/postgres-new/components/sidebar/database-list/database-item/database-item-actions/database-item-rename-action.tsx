import { Pencil } from 'lucide-react'
import { DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { Database } from '~/lib/db'

export function DatabaseItemRenameAction(props: {
  database: Database
  onSelect: (e: Event) => void
}) {
  return (
    <DropdownMenuItem className="gap-3" onSelect={props.onSelect}>
      <Pencil size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
      <span>Rename</span>
    </DropdownMenuItem>
  )
}

export function RenameDatabaseForm(props: { database: Database; onSuccess: () => void }) {
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  return (
    <form
      className="w-72"
      onSubmit={async (e) => {
        e.preventDefault()
        if (e.target instanceof HTMLFormElement) {
          const formData = new FormData(e.target)
          const name = formData.get('name')

          if (typeof name === 'string') {
            await updateDatabase({ ...props.database, name })
          }
        }
        props.onSuccess()
      }}
    >
      <input
        name="name"
        className="flex-grow w-full p-2 outline-none text-base bg-inherit placeholder:text-neutral-400"
        placeholder={`Rename ${props.database.name}`}
        defaultValue={props.database.name ?? undefined}
        autoComplete="off"
        autoFocus
      />
    </form>
  )
}

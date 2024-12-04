import { DownloadIcon, MoreHorizontalIcon, TrashIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { useDatabaseDeleteMutation } from '~/data/databases/database-delete-mutation'
import { MergedDatabase } from '~/data/merged-databases/merged-database'
import { downloadFileFromUrl, titleToKebabCase } from '~/lib/util'

export function ExtraDatabaseActionsButton(props: { database: MergedDatabase }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontalIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DownloadMenuItem database={props.database} />
        <DropdownMenuSeparator />
        <DeleteMenuItem database={props.database} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DownloadMenuItem(props: { database: MergedDatabase }) {
  const { dbManager } = useApp()

  const handleDownloadClick = async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }

    // Ensure the db worker is ready
    await dbManager.getDbInstance(props.database.id)

    const bc = new BroadcastChannel(`${props.database.id}:pg-dump`)

    bc.addEventListener('message', (event) => {
      if (event.data.action === 'dump-result') {
        downloadFileFromUrl(event.data.url, event.data.filename)
        bc.close()
      }
    })

    bc.postMessage({
      action: 'execute-dump',
      filename: `${titleToKebabCase(props.database.name ?? 'My Database')}-${Date.now()}.sql`,
    })
  }

  return (
    <DropdownMenuItem className="gap-2" onClick={handleDownloadClick}>
      <DownloadIcon size={14} /> Download
    </DropdownMenuItem>
  )
}

function DeleteMenuItem(props: { database: MergedDatabase }) {
  const router = useRouter()
  const { mutateAsync: deleteDatabase } = useDatabaseDeleteMutation()

  const handleDeleteClick = async () => {
    await deleteDatabase({ id: props.database.id })
    router.push('/')
  }

  return (
    <DropdownMenuItem className="gap-2" onClick={handleDeleteClick}>
      <TrashIcon size={14} /> Delete
    </DropdownMenuItem>
  )
}

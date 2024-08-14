import { AlertDialogPortal } from '@radix-ui/react-alert-dialog'
import { Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MouseEvent, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { useDatabasesDeleteMutation } from '~/data/databases/database-delete-mutation'
import type { Database } from '~/data/databases/database-type'

type ConfirmDatabaseDeleteAlertProps = {
  children: React.ReactNode
  database: Database
  isActive: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfirmDatabaseDeleteAlert(props: ConfirmDatabaseDeleteAlertProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { deleteDatabase, isLoading: isDeleting } = useDatabasesDeleteMutation()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    props.onOpenChange(open)
  }

  async function handleDelete(e: MouseEvent) {
    e.preventDefault()
    await deleteDatabase(props.database)
    setIsOpen(false)
    if (props.isActive) {
      router.push('/')
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{props.children}</AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{props.database.name}".
              {props.database.deployment && ' All connected applications will lose access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? (
                <span className="flex items-center">
                  <Loader
                    className="animate-spin flex-shrink-0 text-muted-foreground mr-2"
                    size={16}
                    strokeWidth={2}
                  />{' '}
                  Deleting
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  )
}

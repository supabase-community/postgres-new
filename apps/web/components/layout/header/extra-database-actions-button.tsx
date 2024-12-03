import { MoreHorizontalIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Database } from '~/lib/db'

export function ExtraDatabaseActionsButton(props: { database: Database }) {
  return (
    <Button variant="outline" size="sm">
      <MoreHorizontalIcon size={14} />
    </Button>
  )
}

/* eslint-disable react/no-unescaped-entities */
import { useRouter } from 'next/navigation'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { TabsContent } from '~/components/ui/tabs'
import type { MergedDatabase } from '~/data/merged-databases/merged-database'
import { getOauthUrl } from '~/lib/util'

export function ConnectSupabaseTab(props: { database: MergedDatabase }) {
  const router = useRouter()

  return (
    <TabsContent value="supabase" className="flex flex-col pt-4 mt-4 border-t">
      <div>
        <h1 className="text-sm font-semibold mb-1">Connect Supabase</h1>
        <p className="text-sm text-muted-foreground">
          To deploy your database, you need to connect your Supabase account. If you don't already
          have a Supabase account, you can create one for free.
        </p>
        <Button
          variant="default"
          size="sm"
          className="gap-2 w-full mt-4"
          onClick={() => {
            router.push(getOauthUrl({ databaseId: props.database.id }))
          }}
        >
          <SupabaseIcon size={14} /> Connect
        </Button>
      </div>
    </TabsContent>
  )
}

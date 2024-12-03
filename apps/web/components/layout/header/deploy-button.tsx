/* eslint-disable react/no-unescaped-entities */
import { Database } from '~/lib/db'
import { ChevronDown } from 'lucide-react'
import AwsIcon from '~/assets/aws-icon'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

export function DeployButton(props: { database: Database }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          Deploy <ChevronDown size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <Tabs defaultValue="supabase">
          <TabsList className="flex p-0 bg-inherit">
            <TabsTrigger value="supabase" className="flex-1 gap-2 data-[state=active]:bg-accent">
              <SupabaseIcon size={14} /> Supabase
            </TabsTrigger>
            <TabsTrigger value="aws" disabled className="flex-1 gap-2">
              <AwsIcon className="text-xl" /> AWS (soon)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="supabase" className="flex flex-col">
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-sm font-semibold">Connect Supabase</h1>
                <p className="text-sm text-muted-foreground">
                  To deploy your database, you need to connect your Supabase account. If you don't
                  already have a Supabase account, you can create one for free.
                </p>
              </div>
              <Button variant="default" size="sm" className="gap-2">
                <SupabaseIcon size={14} /> Deploy
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

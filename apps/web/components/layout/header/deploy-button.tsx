/* eslint-disable react/no-unescaped-entities */
import { Database } from '~/lib/db'
import { ChevronDown } from 'lucide-react'
import AwsIcon from '~/assets/aws-icon'
import { SupabaseIcon } from '~/components/supabase-icon'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useApp } from '~/components/app-provider'

export function DeployButton(props: { database: Database }) {
  const { user } = useApp()

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="default" size="sm" className="gap-2 opacity-50 cursor-default">
            Deploy <ChevronDown size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sign in to deploy</TooltipContent>
      </Tooltip>
    )
  }

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
          <TabsContent value="supabase" className="flex flex-col pt-4 mt-4 border-t">
            <div>
              <h1 className="text-sm font-semibold mb-1">Connect Supabase</h1>
              <p className="text-sm text-muted-foreground">
                To deploy your database, you need to connect your Supabase account. If you don't
                already have a Supabase account, you can create one for free.
              </p>
              <Button variant="default" size="sm" className="gap-2 w-full mt-4">
                <SupabaseIcon size={14} /> Deploy
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

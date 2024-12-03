/* eslint-disable react/no-unescaped-entities */
import {
  BrainIcon,
  ChevronDown,
  MenuIcon,
  MoreHorizontalIcon,
  PackagePlus,
  SunIcon,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Breadcrumbs } from './breadcrumb'
import { LiveShareIcon } from '~/components/live-share-icon'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tabs } from '@radix-ui/react-tabs'
import { TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { SupabaseIcon } from '~/components/supabase-icon'
import AwsIcon from '~/assets/aws-icon'

type HeaderProps = {}

export function Header(props: HeaderProps) {
  return (
    <div className="flex p-1 gap-2 border-b">
      <MenuButton />
      <CreateDatabaseButton />
      <Breadcrumbs />
      <ThemeToggleButton />
      <BringYourOwnLLMButton />
      <LiveShareButton />
      <DeployButton />
      <ExtrActionsMenu />
    </div>
  )
}

function MenuButton() {
  return (
    <Button variant="ghost" size="sm">
      <MenuIcon size={14} />
    </Button>
  )
}

function CreateDatabaseButton() {
  return (
    <Button variant="default" size="sm" asChild>
      <Link href="/">
        <PackagePlus size={14} />
      </Link>
    </Button>
  )
}

function ThemeToggleButton() {
  return (
    <Button variant="outline" size="sm">
      <SunIcon size={14} />
    </Button>
  )
}

function BringYourOwnLLMButton() {
  return (
    <Button variant="outline" size="sm" className="gap-2">
      <BrainIcon size={14} /> Bring your own LLM
    </Button>
  )
}

function LiveShareButton() {
  return (
    <Button variant="outline" size="sm">
      <LiveShareIcon size={14} />
    </Button>
  )
}

function DeployButton() {
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
              <p className="flex flex-col gap-2">
                <h1 className="text-sm font-semibold">Connect Supabase</h1>
                <p className="text-sm text-muted-foreground">
                  To deploy your database, you need to connect your Supabase account. If you don't
                  already have a Supabase account, you can create one for free.
                </p>
              </p>
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

function ExtrActionsMenu() {
  return (
    <Button variant="outline" size="sm">
      <MoreHorizontalIcon size={14} />
    </Button>
  )
}

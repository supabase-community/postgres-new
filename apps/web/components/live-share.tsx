'use client'

import { Message, generateId } from 'ai'
import { useChat } from 'ai/react'
import { AnimatePresence, m } from 'framer-motion'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Flame,
  Paperclip,
  Pause,
  PlugIcon,
  Square,
} from 'lucide-react'
import {
  FormEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { TablesData } from '~/data/tables/tables-query'
import { saveFile } from '~/lib/files'
import { useAutoScroll, useDropZone } from '~/lib/hooks'
import { requestFileUpload } from '~/lib/util'
import { cn } from '~/lib/utils'
import { AiIconAnimation } from './ai-icon-animation'
import { useApp } from './app-provider'
import ByoLlmButton from './byo-llm-button'
import ChatMessage from './chat-message'
import { CopyableField } from './copyable-field'
import SignInButton from './sign-in-button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useWorkspace } from './workspace'

export function LiveShareOverlay(props: { databaseId: string }) {
  const { liveShare } = useApp()

  if (liveShare.isLiveSharing && liveShare.databaseId === props.databaseId) {
    return (
      <div className="overflow-y-auto p-8">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <h2 className="text-md font-medium">Live sharing your in-browser database</h2>
            <p className="text-muted-foreground text-sm">
              Closing the window will stop the Live Share session
            </p>
          </div>
          <Button
            className="gap-2"
            variant="outline"
            size="sm"
            onClick={() => {
              liveShare.stop()
            }}
          >
            <Pause size={16} />
            Stop
          </Button>
        </div>
        <Tabs defaultValue="uri" className="w-full justify-between bg-muted rounded-md border mt-6">
          <TabsList className="w-full flex justify-start bg-transparent px-3">
            <TabsTrigger
              value="uri"
              className="hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-none! data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none relative cursor-pointer text-foreground-lighter flex items-center space-x-2 text-center transition focus:outline-none focus-visible:ring focus-visible:ring-foreground-muted focus-visible:border-foreground-muted  text-xs px-2.5 py-1"
            >
              URI
            </TabsTrigger>
            <TabsTrigger
              value="psql"
              className="hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-none! data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none relative cursor-pointer text-foreground-lighter flex items-center space-x-2 text-center transition focus:outline-none focus-visible:ring focus-visible:ring-foreground-muted focus-visible:border-foreground-muted  text-xs px-2.5 py-1"
            >
              PSQL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="uri" className="px-2 pb-2">
            <CopyableField
              value={`postgres://postgres@${liveShare.databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}/postgres?sslmode=require`}
            />
          </TabsContent>
          <TabsContent value="psql" className="px-2 pb-2">
            <CopyableField
              value={`psql "postgres://postgres@${liveShare.databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}/postgres?sslmode=require"`}
            />
          </TabsContent>
        </Tabs>

        <div className="border rounded-md p-2 mt-4">
          {liveShare.clientIp ? (
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>
                Connected from <span className="text-card-foreground">{liveShare.clientIp}</span>
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
              <span>No client connected</span>
            </p>
          )}
        </div>

        <Accordion type="single" collapsible className="mt-8 border-t pt-8">
          <AccordionItem value="postgres-clients" className="p-0">
            <AccordionTrigger className="p-0 gap-2 font-semibold text-sm py-3">
              <span>Can I connect using any Postgres client?</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Yes! Any standard Postgres client that communicates using the Postgres wire protocol
                is supported. Connections are established over an encrypted TLS channel using the
                SNI extension, so your client will also need to support TLS with SNI (most modern
                clients support this).
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="concurrent-connections" className="p-0">
            <AccordionTrigger className="p-0 gap-2 font-semibold text-sm py-3">
              <span>How many concurrent connections can I have?</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>
                PGlite operates in single-user mode, so you can only establish one connection at a
                time per database. If you attempt to establish more than one connection using the
                Live Share connection string, you will receive a &quot;too many clients&quot; error.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="orms" className="p-0">
            <AccordionTrigger className="p-0 gap-2 font-semibold text-sm py-3">
              <span>Does this work with ORMs?</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Yes, as long as your ORM doesn&apos;t require multiple concurrent connections. Some
                ORMs like Prisma run a shadow database in parallel to your main database in order to
                generate migrations. In order to use Prisma, you will need to{' '}
                <a
                  href="https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database#manually-configuring-the-shadow-database"
                  target="__blank"
                  rel="noopener noreferrer"
                >
                  manually configure
                </a>{' '}
                your shadow database to point to another temporary database.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="connection-length" className="p-0">
            <AccordionTrigger className="p-0 gap-2 font-semibold text-sm py-3">
              <span>How long will connections last?</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>
                You can connect over Live Share for as long as your browser tab is active. Once your
                tab is closed, the any existing connection will terminate and you will no longer be
                able to connect to your database using the connection string.
              </p>
              <p>
                To prevent overloading the system, we also enforce a 5 minute idle timeout per
                client connection and 1 hour total timeout per database. If you need to communicate
                longer than these limits, simply reconnect after the timeout.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="under-the-hood" className="p-0">
            <AccordionTrigger className="p-0 gap-2 font-semibold text-sm py-3">
              <span>How does this work under the hood?</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>
                We host a{' '}
                <a
                  href="https://github.com/supabase-community/database-build/tree/main/apps/browser-proxy"
                  target="__blank"
                  rel="noopener noreferrer"
                >
                  lightweight proxy
                </a>{' '}
                between your Postgres client and your in-browser PGlite database. It uses{' '}
                <a
                  href="https://github.com/supabase-community/pg-gateway"
                  target="__blank"
                  rel="noopener noreferrer"
                >
                  pg-gateway
                </a>{' '}
                to proxy inbound TCP connections to the corresponding browser instance via a Web
                Socket reverse tunnel.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    )

    return null
  }
}

export default LiveShareOverlay

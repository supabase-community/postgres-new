'use client'

import 'chart.js/auto'
import 'chartjs-adapter-date-fns'

import { DialogTrigger } from '@radix-ui/react-dialog'
import { LazyMotion, m } from 'framer-motion'
import { Loader, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { PropsWithChildren, useState } from 'react'
import { TooltipProvider } from '~/components/ui/tooltip'
import { useDatabasesQuery } from '~/data/databases/databases-query'
import { useBreakpoint } from '~/lib/use-breakpoint'
import {
  currentDomainHostname,
  currentDomainUrl,
  legacyDomainHostname,
  legacyDomainUrl,
} from '~/lib/util'
import { useApp } from './app-provider'
import { LiveShareIcon } from './live-share-icon'
import Sidebar from './sidebar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

const loadFramerFeatures = () => import('./framer-features').then((res) => res.default)

export type LayoutProps = PropsWithChildren

export default function Layout({ children }: LayoutProps) {
  const { isLegacyDomain, isLegacyDomainRedirect } = useApp()
  const isSmallBreakpoint = useBreakpoint('lg')

  return (
    <LazyMotion features={loadFramerFeatures}>
      <TooltipProvider delayDuration={0}>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {!isLegacyDomain && <LiveShareBanner />}
          {(isLegacyDomain || isLegacyDomainRedirect) && <RenameBanner />}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* TODO: make sidebar available on mobile */}
            {!isSmallBreakpoint && <Sidebar />}
            <m.div layout="position" className="w-full h-full min-w-0 min-h-0">
              {children}
            </m.div>
          </main>
        </div>
        <RenameDialog />
      </TooltipProvider>
    </LazyMotion>
  )
}

function LiveShareBanner() {
  const [videoLoaded, setVideoLoaded] = useState(false)

  return (
    <div className="px-3 py-3 flex gap-1 justify-center text-sm text-center bg-neutral-800 text-white">
      <span>New: Connect to your in-browser databases from outside the browser.</span>
      <Dialog onOpenChange={() => setVideoLoaded(false)}>
        <DialogTrigger asChild>
          <span className="underline cursor-pointer">Learn more.</span>
        </DialogTrigger>
        <DialogContent className="max-w-2x max-h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Introducing Live Share</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>

          <div className="prose">
            <p>
              With Live Share, you can connect directly to your in-browser PGlite databases from{' '}
              <em>outside the browser</em>.
            </p>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!videoLoaded && (
                <div style={{ position: 'absolute', zIndex: 1, color: 'white' }}>
                  <Loader className="animate-spin" size={36} strokeWidth={0.75} />
                </div>
              )}
              <m.video
                width="1860"
                height="1080"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1 },
                }}
                initial="hidden"
                animate={videoLoaded ? 'show' : 'hidden'}
                className="rounded-sm m-0"
                autoPlay
                loop
                onLoadedData={() => setVideoLoaded(true)}
              >
                <source
                  src="https://github.com/user-attachments/assets/78c45f61-4213-49f0-a563-55b426dd6c35"
                  type="video/mp4"
                />
              </m.video>
            </div>

            <m.div layout className="inline-block">
              <h4 className="font-bold">How does it work?</h4>

              <ol className="mb-0">
                <li>
                  Click on the <MoreVertical size={16} className="text-muted-foreground inline" />{' '}
                  menu next your database and tap{' '}
                  <strong>
                    <LiveShareIcon size={16} className="text-muted-foreground inline" /> Live Share
                  </strong>
                </li>
                <li>A unique connection string will appear for your database</li>
                <li>
                  Copy-paste the connection string into any Postgres client (like <code>psql</code>)
                  and begin querying!
                </li>
              </ol>
            </m.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RenameBanner() {
  const { setIsRenameDialogOpen } = useApp()
  return (
    <div className="px-3 py-3 flex justify-center text-sm text-center bg-neutral-800 text-white">
      <span>
        Heads up - <strong>{legacyDomainHostname}</strong> is renaming to{' '}
        <strong>{currentDomainHostname}</strong>.{' '}
        <a className="cursor-pointer underline" onClick={() => setIsRenameDialogOpen(true)}>
          Why?
        </a>
      </span>
    </div>
  )
}

function RenameDialog() {
  const { isRenameDialogOpen, setIsRenameDialogOpen, dbManager, isLegacyDomain } = useApp()
  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()

  return (
    <Dialog open={isRenameDialogOpen} onOpenChange={(open) => setIsRenameDialogOpen(open)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Heads up - {legacyDomainHostname} is renaming to {currentDomainHostname}
          </DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>

        <h3 className="font-bold">Why rename?</h3>

        <p>
          This project is not an official Postgres project and we don&apos;t want to mislead anyone!
          We&apos;re renaming to{' '}
          <Link href={currentDomainUrl} className="underline">
            {currentDomainHostname}
          </Link>{' '}
          because, well, that&apos;s what this does. This will still be 100% Postgres-focused, just
          with a different URL.
        </p>

        <div className="my-2 border-b" />

        {isLegacyDomain && isLoadingDatabases ? (
          <div className="self-stretch flex justify-center items-center">
            <Loader className="animate-spin" size={36} strokeWidth={0.75} />
          </div>
        ) : (
          <m.div
            className="flex flex-col gap-4"
            variants={{
              hidden: { opacity: 0, y: -10 },
              show: { opacity: 1, y: 0 },
            }}
            initial="hidden"
            animate="show"
          >
            {isLegacyDomain && databases && databases.length === 0 ? (
              <>
                <h3 className="font-bold">No action required</h3>

                <p>
                  Looks like you don&apos;t have any existing databases that you need to transfer.
                </p>

                <p>
                  {' '}
                  Head on over to{' '}
                  <a href={currentDomainUrl} className="underline">
                    {currentDomainHostname}
                  </a>{' '}
                  to get started.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold">Action required</h3>

                <div className="prose">
                  {isLegacyDomain && databases ? (
                    <>
                      You have {databases.length} existing{' '}
                      {databases.length === 1 ? 'database' : 'databases'} on {legacyDomainHostname}.
                      If you wish to continue using {databases.length === 1 ? 'it' : 'them'}, you
                      will need to{' '}
                      <Link
                        className="underline"
                        href={`${legacyDomainUrl}/export`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        export
                      </Link>{' '}
                      {databases.length === 1 ? 'it' : 'them'}, then{' '}
                      <Link
                        className="underline"
                        href={`${currentDomainUrl}/import`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        import
                      </Link>{' '}
                      {databases.length === 1 ? 'it' : 'them'} at {currentDomainHostname}.
                    </>
                  ) : (
                    <>
                      If you have existing database on {legacyDomainHostname} and wish continue
                      using them, you will need to{' '}
                      <Link
                        className="underline"
                        href={`${legacyDomainUrl}/export`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        export
                      </Link>{' '}
                      them, then{' '}
                      <Link
                        className="underline"
                        href={`${currentDomainUrl}/import`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        import
                      </Link>{' '}
                      them at {currentDomainHostname}.
                    </>
                  )}
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1" className="border rounded-md">
                    <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                      <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                        <span>Why do I need to export my databases?</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-3 prose prose-sm">
                      <p>
                        Since PGlite databases are stored in your browser&apos;s IndexedDB storage,
                        other domains like{' '}
                        <a href={currentDomainUrl} className="underline">
                          {currentDomainHostname}
                        </a>{' '}
                        cannot access them directly (this is a security restriction built into every
                        browser).
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <p>
                  The deadline to transfer your data is November 15, 2024. If you don&apos;t
                  transition to {currentDomainHostname} by then, you will lose your data.
                </p>

                <p className="prose">
                  To transfer your databases:
                  <ol>
                    <li>
                      Navigate to{' '}
                      <Link className="underline" href={`${legacyDomainUrl}/export`}>
                        {legacyDomainHostname}/export
                      </Link>{' '}
                      and click <strong>Export</strong>
                    </li>
                    <li>
                      Navigate to{' '}
                      <Link className="underline" href={`${currentDomainUrl}/import`}>
                        {currentDomainHostname}/import
                      </Link>{' '}
                      and click <strong>Import</strong>
                    </li>
                  </ol>
                </p>
              </>
            )}
          </m.div>
        )}
      </DialogContent>
    </Dialog>
  )
}

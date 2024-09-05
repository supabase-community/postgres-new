'use client'

import 'chart.js/auto'
import 'chartjs-adapter-date-fns'

import { LazyMotion, m } from 'framer-motion'
import { PropsWithChildren } from 'react'
import { TooltipProvider } from '~/components/ui/tooltip'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { useApp } from './app-provider'
import Sidebar from './sidebar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

const loadFramerFeatures = () => import('./framer-features').then((res) => res.default)

const legacyDomain = 'postgres.new'
const referrerDomain =
  typeof window !== 'undefined' && document.referrer
    ? new URL(document.referrer).hostname || undefined
    : undefined

const isLegacyDomain = typeof window !== 'undefined' && window.location.hostname === legacyDomain
const isLegacyDomainReferrer = referrerDomain === legacyDomain

export type LayoutProps = PropsWithChildren

export default function Layout({ children }: LayoutProps) {
  const { isPreview } = useApp()
  const isSmallBreakpoint = useBreakpoint('lg')

  return (
    <LazyMotion features={loadFramerFeatures}>
      <TooltipProvider delayDuration={0}>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {isPreview && <PreviewBanner />}
          {/* TODO: re-enable rename banner when ready */}
          {false && (isLegacyDomain || isLegacyDomainReferrer) && <RenameBanner />}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* TODO: make sidebar available on mobile */}
            {!isSmallBreakpoint && <Sidebar />}
            <m.div layout="position" className="w-full h-full min-w-0 min-h-0">
              {children}
            </m.div>
          </main>
        </div>
      </TooltipProvider>
    </LazyMotion>
  )
}

function PreviewBanner() {
  return (
    <div className="px-3 py-3 flex justify-center text-sm text-center bg-neutral-800 text-white">
      Heads up! This is a preview version of postgres.new, so expect some changes here and there.
    </div>
  )
}

function RenameBanner() {
  return (
    <div className="px-3 py-3 flex justify-center text-sm text-center bg-neutral-800 text-white">
      <span>
        Heads up - <strong>postgres.new</strong> is renaming to <strong>database.build</strong>.{' '}
        <Dialog>
          <DialogTrigger className="underline">Why?</DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Why is postgres.new renaming?</DialogTitle>
              <div className="py-2 border-b" />
            </DialogHeader>
            <p>
              We are renaming due to a trademark conflict on the name &quot;Postgres&quot;. To
              respect intellectual property rights, we are transitioning to our new name,{' '}
              <a href="https://database.build" className="underline">
                database.build
              </a>
              .
            </p>
            <p>
              {' '}
              Renaming will allow us to continue offering the same experience under a different name
              without any interruptions to the service.
            </p>
          </DialogContent>
        </Dialog>
      </span>
    </div>
  )
}

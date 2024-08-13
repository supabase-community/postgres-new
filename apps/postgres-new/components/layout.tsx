'use client'

import 'chart.js/auto'
import 'chartjs-adapter-date-fns'

import { LazyMotion, m } from 'framer-motion'
import { PropsWithChildren } from 'react'
import { TooltipProvider } from '~/components/ui/tooltip'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { useApp } from './app-provider'
import Sidebar from './sidebar'

const loadFramerFeatures = () => import('./framer-features').then((res) => res.default)

export type LayoutProps = PropsWithChildren

export default function Layout({ children }: LayoutProps) {
  const { isPreview } = useApp()
  const isSmallBreakpoint = useBreakpoint('lg')

  return (
    <LazyMotion features={loadFramerFeatures}>
      <TooltipProvider delayDuration={0}>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {isPreview && (
            <div className="px-3 py-3 flex justify-center text-sm text-center bg-neutral-800 text-white">
              Heads up! This is a preview version of postgres.new, so expect some changes here and
              there.
            </div>
          )}
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

'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useState } from 'react'
import React from 'react'
import { DatabaseList } from './database-list/database-list'
import { CollapsedSidebarHeader, SidebarHeader } from './sidebar-header'
import { CollapsedSidebparFooter, SidebarFooter } from './sidebar-footer/sidebar-footer'

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (isCollapsed) {
    return (
      <div className="flex flex-col pl-4 py-4 justify-between">
        <CollapsedSidebarHeader onExpand={() => setIsCollapsed(false)} />
        <CollapsedSidebparFooter />
      </div>
    )
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <m.div
        className="max-w-72 w-full h-full flex flex-col gap-2 items-stretch p-4 bg-card"
        variants={{
          hidden: { opacity: 0, x: '-100%' },
          show: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.25 }}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, transition: { duration: 0 } }}
      >
        <SidebarHeader onCollapse={() => setIsCollapsed(true)} />
        <DatabaseList />
        <SidebarFooter />
      </m.div>
    </AnimatePresence>
  )
}

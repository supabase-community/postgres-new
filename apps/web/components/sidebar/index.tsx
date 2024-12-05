'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Database as DbIcon, Loader } from 'lucide-react'
import { useParams } from 'next/navigation'

import { useApp } from '~/components/app-provider'

import { useMergedDatabases } from '~/data/merged-databases/merged-databases'

import { DatabaseMenuItem } from './database-menu-item'

export default function Sidebar() {
  const { setIsRenameDialogOpen, isLegacyDomain } = useApp()
  let { id: currentDatabaseId } = useParams<{ id: string }>()
  const { showSidebar } = useApp()

  const { data: databases, isLoading: isLoadingDatabases } = useMergedDatabases()

  if (!showSidebar) {
    return null
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <m.div
        className="max-w-full md:max-w-64 border-r w-full h-full flex flex-col gap-2 items-stretch p-4 bg-card absolute top-[50px] bottom-0 left-0 z-20 xl:static"
        variants={{
          hidden: { opacity: 0, x: '-100%' },
          show: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.25 }}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, transition: { duration: 0 } }}
      >
        {databases && databases.length > 0 ? (
          <m.div
            className="flex-1 flex flex-col items-stretch overflow-y-auto overflow-x-hidden"
            transition={{ staggerChildren: 0.03 }}
            initial="hidden"
            animate="show"
          >
            {databases.map((database) => (
              <m.div
                key={database.id}
                layout="position"
                layoutId={`database-menu-item-${database.id}`}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  show: { opacity: 1, x: 0 },
                }}
              >
                <DatabaseMenuItem
                  database={database}
                  isActive={database.id === currentDatabaseId}
                />
              </m.div>
            ))}
          </m.div>
        ) : (
          <div className="flex-1 flex flex-col gap-2 my-10 mx-5 items-center text-base text-neutral-400 opacity-75">
            {isLoadingDatabases ? (
              <Loader className="animate-spin" size={48} strokeWidth={0.75} />
            ) : (
              <>
                <DbIcon size={48} strokeWidth={0.75} />
                <span>No databases</span>
                {!isLegacyDomain && (
                  <a
                    className="mt-2 underline cursor-pointer text-xs text-primary/50"
                    onClick={() => setIsRenameDialogOpen(true)}
                  >
                    Where did my databases go?
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </m.div>
    </AnimatePresence>
  )
}

function Footer() {
  return (
    <div className="flex flex-row gap-1 pb-1 text-xs text-neutral-500 text-center justify-center">
      <a
        className="underline cursor-pointer"
        href="https://github.com/supabase-community/database-build"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn about database.build
      </a>{' '}
      |{' '}
      <a
        className="underline cursor-pointer"
        href="https://github.com/supabase-community/database-build/issues/new/choose"
        target="_blank"
        rel="noopener noreferrer"
      >
        Report an issue
      </a>
    </div>
  )
}

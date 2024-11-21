'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PropsWithChildren, useEffect } from 'react'
import AppProvider from './app-provider'
import { LockProvider } from './lock-provider'
import { ThemeProvider } from './theme-provider'

const queryClient = new QueryClient()

async function registerServiceWorker() {
  await navigator.serviceWorker.register('/sw.mjs').catch((error) => {
    console.error('Failed to register service worker', error)
  })
}

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <LockProvider namespace="database-build-lock">
          <AppProvider>{children}</AppProvider>
        </LockProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

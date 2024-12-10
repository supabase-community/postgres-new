'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PropsWithChildren, useEffect } from 'react'
import AppProvider from './app-provider'
import { LockProvider } from './lock-provider'
import { ThemeProvider } from './theme-provider'

const queryClient = new QueryClient()

async function registerServiceWorker() {
  try {
    const reg = await navigator.serviceWorker.getRegistration()

    // If this was a hard refresh (no controller), browsers will disable service workers
    // We should soft reload the page to ensure the service worker is active
    if (reg?.active && !navigator.serviceWorker.controller) {
      window.location.reload()
    }
    await navigator.serviceWorker.register('/sw.mjs', { scope: '/' })
  } catch (error) {
    console.error('Failed to register service worker', error)
  }
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

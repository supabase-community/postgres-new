'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PropsWithChildren } from 'react'
import AppProvider from './app-provider'
import { ThemeProvider } from './theme-provider'

const queryClient = new QueryClient()

export default function Providers({ children }: PropsWithChildren) {
  return (
    // Force theme until we implement dark mode
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AppProvider>{children}</AppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

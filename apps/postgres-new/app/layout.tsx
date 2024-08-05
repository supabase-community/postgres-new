import 'katex/dist/katex.min.css'
import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Layout from '~/components/layout'
import Providers from '~/components/providers'
import { cn } from '~/lib/utils'
import { ErrorBoundary } from 'react-error-boundary'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Postgres Sandbox',
  description: 'In-browser Postgres sandbox with AI assistance',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className)}>
        <ErrorBoundary fallback={<div>Error fallback</div>}>
          <Suspense fallback={<div>Suspense fallback</div>}>
            <Providers>
              <Layout>{children}</Layout>
            </Providers>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
}

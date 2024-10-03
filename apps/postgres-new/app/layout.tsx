import './globals.css'
import 'katex/dist/katex.min.css'

import type { Metadata } from 'next'
import { Inter as FontSans } from 'next/font/google'
import Providers from '~/components/providers'
import { cn } from '~/lib/utils'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
})

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
      <body className={cn('bg-background font-sans antialiased', fontSans.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

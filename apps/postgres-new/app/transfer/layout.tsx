import type { Metadata } from 'next'

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
      <body>Test123: {children}</body>
    </html>
  )
}

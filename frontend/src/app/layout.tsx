import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reddit Copilot',
  description: 'AI-powered Reddit content assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
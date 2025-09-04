export const dynamic = 'force-dynamic';
import "./globals.css"

import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import { UserMenu } from '@/components/ui/user-menu'
import ErrorBoundary from '@/components/ui/error-boundary'
import Link from 'next/link'

// Use system fonts instead of Google Fonts to avoid DNS dependencies
const fontClass = 'font-sans'

export const metadata: Metadata = {
  title: 'Orion Content',
  description: 'Content management and automation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={fontClass}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-8">
                    <h1 className="text-xl font-bold text-gray-900">Orion Content</h1>
                    <nav className="hidden md:flex space-x-4">
                      <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                        Home
                      </Link>
                      <Link href="/credentials" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                        Credentials
                      </Link>
                    </nav>
                  </div>
                  <UserMenu />
                </div>
              </div>
            </nav>
            <main>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}

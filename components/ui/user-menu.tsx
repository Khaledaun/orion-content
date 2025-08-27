
'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from './button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'

export function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [simpleSession, setSimpleSession] = useState<{ email: string } | null>(null)

  // Check for simple session (Phase 1) if NextAuth session doesn't exist
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      // Check for simple session cookie
      fetch('/api/user')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.email) {
            setSimpleSession({ email: data.email })
          }
        })
        .catch(() => {})
    }
  }, [session, status])

  const handleSignOut = async () => {
    if (session) {
      // NextAuth sign out
      await signOut({ redirect: false })
    } else if (simpleSession) {
      // Simple session logout
      await fetch('/api/logout', { method: 'POST' })
      setSimpleSession(null)
    }
    router.push('/login')
  }

  const handleSignIn = () => {
    signIn('google', { callbackUrl: '/' })
  }

  // Show user info if either session exists
  const currentUser = session?.user || simpleSession
  const userEmail = session?.user?.email || simpleSession?.email

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center space-x-4">
        <Button onClick={handleSignIn} variant="outline" size="sm">
          Sign in with Google
        </Button>
        <Button onClick={() => router.push('/login')} size="sm">
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">
                {userEmail?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm">{userEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push('/setup')}>
            Setup
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/sites')}>
            Sites
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/weeks')}>
            Weeks
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}



import { SessionOptions } from 'iron-session'
import { sealData, unsealData } from 'iron-session'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { prisma } from './prisma'
import { decryptJson } from './crypto'

export interface SessionData {
  userId: string
  email: string
  isAuthenticated: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'orion-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
}

export async function getSession(req?: Request): Promise<SessionData | null> {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('orion-session')
  
  if (!sessionCookie) return null
  
  try {
    const sessionData = await unsealData<SessionData>(sessionCookie.value, sessionOptions)
    if (sessionData && sessionData.isAuthenticated) {
      return sessionData
    }
  } catch (error) {
    console.error('Session decode error:', error)
  }
  
  return null
}

export async function createSession(userId: string, email: string) {
  const cookieStore = cookies()
  const sessionData: SessionData = {
    userId,
    email,
    isAuthenticated: true,
  }
  
  const sealedData = await sealData(sessionData, sessionOptions)
  cookieStore.set('orion-session', sealedData, sessionOptions.cookieOptions)
}

export async function destroySession() {
  const cookieStore = cookies()
  cookieStore.delete('orion-session')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Phase 2: Multi-auth support
export async function getSessionUser(req?: NextRequest): Promise<{ id: string; email: string } | null> {
  // Try NextAuth session first
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      if (user) {
        return { id: user.id, email: user.email }
      }
    }
  } catch (error) {
    // NextAuth not configured or error, fall back to simple auth
  }
  
  // Fall back to simple cookie session (Phase 1)
  const simpleSession = await getSession()
  if (simpleSession) {
    return { id: simpleSession.userId, email: simpleSession.email }
  }
  
  return null
}

export async function getBearerOrSessionUser(req: NextRequest): Promise<{ id: string; email: string } | null> {
  // Check for Bearer token first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    
    try {
      const connection = await prisma.connection.findFirst({
        where: { kind: 'console_api_token' }
      })
      
      if (connection) {
        const decrypted = decryptJson<{ token: string }>(connection.dataEnc)
        if (decrypted.token === token) {
          // Token is valid, but we need to return a user. For API tokens, we'll use the first admin user
          const adminUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'asc' }
          })
          if (adminUser) {
            return { id: adminUser.id, email: adminUser.email }
          }
        }
      }
    } catch (error) {
      console.error('Bearer token validation error:', error)
    }
  }
  
  // Fall back to session-based auth
  return getSessionUser(req)
}

export function requireAuth(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const user = await getBearerOrSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Add user to request context
    ;(req as any).user = user
    return handler(req, ...args)
  }
}

export async function requireSessionAuth() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

// For API routes that require authentication
export async function requireApiAuth(req: NextRequest): Promise<{ id: string; email: string }> {
  const user = await getBearerOrSessionUser(req)
  if (!user) {
    throw new Error('Bearer token required')
  }
  return user
}

// Alias for compatibility
export const deleteSession = destroySession

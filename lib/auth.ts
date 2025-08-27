
import { SessionOptions } from 'iron-session'
import { sealData, unsealData } from 'iron-session'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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
    path: '/',
  },
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function encrypt(payload: SessionData) {
  return sealData(payload, sessionOptions)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const payload = await unsealData(session, sessionOptions)
    return payload as SessionData
  } catch (error) {
    return null
  }
}

export async function createSession(userId: string, email: string) {
  const session = await encrypt({ userId, email, isAuthenticated: true })
  const cookieStore = await cookies()
  cookieStore.set('orion-session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('orion-session')
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('orion-session')?.value
  return decrypt(session)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.isAuthenticated) {
    redirect('/login')
  }
  return session
}

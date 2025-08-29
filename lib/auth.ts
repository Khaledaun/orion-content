import { NextRequest } from 'next/server'

export interface AuthResult {
  authorized: boolean
  user?: {
    id: string
    email: string
    role?: string
  }
  error?: string
}

export async function requireApiAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authorized: false,
        error: 'Missing or invalid authorization header'
      }
    }

    const token = authHeader.substring(7)
    
    // For development, accept any non-empty token except 'invalid-token'
    if (process.env.NODE_ENV === 'development' && token && token !== 'invalid-token') {
      return {
        authorized: true,
        user: {
          id: 'dev-user',
          email: 'dev@example.com',
          role: 'admin'
        }
      }
    }

    // In production, validate against API secret token
    if (token === process.env.API_SECRET_TOKEN) {
      return {
        authorized: true,
        user: {
          id: 'api-user',
          email: 'api@example.com', 
          role: 'admin'
        }
      }
    }

    return {
      authorized: false,
      error: 'Invalid token'
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    return {
      authorized: false,
      error: 'Authentication failed'
    }
  }
}

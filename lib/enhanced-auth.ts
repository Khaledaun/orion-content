
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from './auth'
import { rateLimit } from './rate-limit'
import { auditLog } from './audit'

interface AuthConfig {
  role?: 'admin' | 'user'
  rateLimitConfig?: {
    windowMs: number
    limit: number
  }
}

export async function requireBearerToken(
  req: NextRequest,
  config: AuthConfig = {}
): Promise<{ id: string; email: string }> {
  const route = req.nextUrl.pathname
  const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  
  try {
    // Rate limiting
    if (config.rateLimitConfig) {
      const rateLimitResult = await rateLimit(req, {
        key: `api:${route}`,
        ...config.rateLimitConfig
      })
      
      if (!rateLimitResult.success) {
        await auditLog({
          route,
          actor: clientIP,
          action: 'rate_limit_exceeded',
          metadata: {
            limit: rateLimitResult.limit,
            reset: rateLimitResult.reset
          },
          ip: clientIP
        })
        
        const response = NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset
          },
          { status: 429 }
        )
        
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
        
        throw response
      }
    }
    
    // Authentication
    const user = await requireApiAuth(req)
    
    // Role check (for now, all authenticated users are admins)
    if (config.role === 'admin') {
      // In a real system, you'd check user.role
      // For now, we'll assume first user is admin
    }
    
    // Success audit log
    await auditLog({
      route,
      actor: user.email,
      action: 'authenticated_access',
      metadata: {
        userId: user.id,
        userAgent: req.headers.get('user-agent')
      },
      ip: clientIP
    })
    
    return user
    
  } catch (error) {
    if (error instanceof NextResponse) {
      throw error // Rate limit response
    }
    
    // Authentication failed
    await auditLog({
      route,
      actor: clientIP,
      action: 'auth_failed',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: req.headers.get('user-agent'),
        authHeader: req.headers.get('authorization') ? 'present' : 'missing'
      },
      ip: clientIP
    })
    
    if (error instanceof Error && error.message.includes('Bearer')) {
      throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

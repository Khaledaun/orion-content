
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // CSP for API routes
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; object-src 'none';"
  )
  
  return response
}

export function createSecureResponse(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return addSecurityHeaders(response)
}

export function createSecureErrorResponse(message: string, status = 500): NextResponse {
  logger.error({ message, status }, 'API Error Response')
  const response = NextResponse.json({ error: message }, { status })
  return addSecurityHeaders(response)
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

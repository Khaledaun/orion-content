import { NextResponse } from 'next/server'

export function createSecureResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
}

export function createSecureErrorResponse(message: string, status = 500) {
  return createSecureResponse({ error: message }, status)
}

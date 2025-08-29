import { NextRequest } from 'next/server'

// Simple in-memory rate limiting for development
const requests = new Map<string, { count: number; resetTime: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // 10 requests per minute

export async function checkRateLimit(request: NextRequest, identifier?: string) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const key = identifier ?? ip
  const now = Date.now()
  
  // Clean up expired entries
  const toDelete: string[] = []
  requests.forEach((value, k) => {
    if (now > value.resetTime) {
      toDelete.push(k)
    }
  })
  toDelete.forEach(k => requests.delete(k))
  
  // Get or create entry
  let entry = requests.get(key)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW_MS }
    requests.set(key, entry)
  }
  
  entry.count++
  
  const success = entry.count <= MAX_REQUESTS
  const remaining = Math.max(0, MAX_REQUESTS - entry.count)
  
  return {
    success,
    limit: MAX_REQUESTS,
    reset: entry.resetTime,
    remaining,
    headers: {
      'X-RateLimit-Limit': MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    }
  }
}

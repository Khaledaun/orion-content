
import { NextRequest } from 'next/server'

interface RateLimitConfig {
  key: string
  windowMs: number
  limit: number
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory rate limiting for development
// For production, switch to Redis/Upstash
const store = new Map<string, RateLimitStore>()

export async function rateLimit(req: NextRequest, config: RateLimitConfig): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  // Get client identifier (IP address)
  const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  const key = `${config.key}:${clientIP}`
  
  let record = store.get(key)
  
  // Clean up expired records
  if (record && record.resetTime < now) {
    record = undefined
  }
  
  if (!record) {
    record = {
      count: 1,
      resetTime: now + config.windowMs
    }
    store.set(key, record)
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: record.resetTime
    }
  }
  
  if (record.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: record.resetTime
    }
  }
  
  record.count++
  store.set(key, record)
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetTime
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (record.resetTime < now) {
      store.delete(key)
    }
  }
}, 60000) // Clean up every minute

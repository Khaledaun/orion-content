
import { NextRequest } from 'next/server'
import { getRedisStore } from './redis-store'

interface RateLimitConfig {
  key: string
  windowMs: number
  limit: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Production rate limiting with Redis/Upstash backend
// Falls back to in-memory for development
const memoryStore = new Map<string, { count: number; resetTime: number }>()

export async function rateLimitProd(req: NextRequest, config: RateLimitConfig): Promise<RateLimitResult> {
  const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitKey = `rate_limit:${config.key}:${clientIP}`
  const redisStore = getRedisStore()
  
  const now = Date.now()
  const windowStart = now - config.windowMs
  const resetTime = now + config.windowMs

  if (redisStore.isAvailable()) {
    // Production: Use Redis with sliding window
    try {
      // Use sorted set for sliding window rate limiting
      const windowKey = `${rateLimitKey}:window`
      
      // Remove expired entries
  await redisStore.zrange(windowKey, 0, windowStart)
  // Count current requests in window
  const currentCount = (await redisStore.zrange(windowKey, windowStart, Date.now())).length
      
      if (currentCount >= config.limit) {
        return {
          success: false,
          limit: config.limit,
          remaining: 0,
          reset: resetTime
        }
      }
      
      // Add current request
      await redisStore.zadd(windowKey, now, `${now}-${Math.random()}`)
      await redisStore.expire(windowKey, Math.ceil(config.windowMs / 1000))
      
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - currentCount - 1,
        reset: resetTime
      }
    } catch (error) {
      console.error('Redis rate limiting error, falling back to memory:', error)
      // Fall back to memory store
    }
  }

  // Development or Redis fallback: Use in-memory store
  let record = memoryStore.get(rateLimitKey)
  
  if (record && record.resetTime < now) {
    record = undefined
  }
  
  if (!record) {
    record = { count: 1, resetTime }
    memoryStore.set(rateLimitKey, record)
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime
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
  memoryStore.set(rateLimitKey, record)
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetTime
  }
}

// Clean up expired memory entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetTime < now) {
      memoryStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  api: {
    rulebook: {
      get: { windowMs: 60000, limit: 30 }, // 30 requests per minute
      post: { windowMs: 300000, limit: 5 }  // 5 updates per 5 minutes
    },
    strategy: {
      get: { windowMs: 60000, limit: 50 }, // 50 requests per minute
      post: { windowMs: 300000, limit: 20 } // 20 updates per 5 minutes
    },
    pipeline: {
      process: { windowMs: 60000, limit: 10 } // 10 pipeline runs per minute
    }
  },
  burst: {
    // Higher limits for burst testing
    test: { windowMs: 60000, limit: 100 }
  }
} as const


import { NextRequest } from 'next/server'
import { getRedisStore } from './redis-store'
import { logger } from './logger'

export interface RateLimitConfig {
  windowMs: number
  limit: number
  keyGenerator?: (request: NextRequest) => string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  headers: Record<string, string>
}

export class RateLimiter {
  private redis = getRedisStore()

  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : this.getDefaultKey(request)

    const now = Date.now()
    const windowStart = now - config.windowMs
    const redisKey = `rate_limit:${key}`

    try {
      // Clean old entries and count current requests
      await this.redis.zremrangebyscore(redisKey, 0, windowStart)
      const currentCount = await this.redis.zcard(redisKey)

      const remaining = Math.max(0, config.limit - currentCount)
      const resetTime = now + config.windowMs

      const headers = {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Window': config.windowMs.toString()
      }

      if (currentCount >= config.limit) {
        logger.warn({ key, currentCount, limit: config.limit }, 'Rate limit exceeded')
        return {
          success: false,
          limit: config.limit,
          remaining: 0,
          resetTime,
          headers: {
            ...headers,
            'Retry-After': Math.ceil(config.windowMs / 1000).toString()
          }
        }
      }

      // Add current request
      await this.redis.zadd(redisKey, now, `${now}-${Math.random()}`)
      await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000))

      return {
        success: true,
        limit: config.limit,
        remaining: remaining - 1,
        resetTime,
        headers
      }

    } catch (error) {
      logger.error({ error, key }, 'Rate limiter error')
      // Fail open - allow request if Redis is down
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - 1,
        resetTime: now + config.windowMs,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': (config.limit - 1).toString(),
          'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
          'X-RateLimit-Window': config.windowMs.toString()
        }
      }
    }
  }

  private getDefaultKey(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return `${ip}:${userAgent.slice(0, 50)}`
  }
}

export const rateLimiter = new RateLimiter()

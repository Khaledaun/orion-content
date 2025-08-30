
import { Redis } from 'ioredis'

// Redis/Upstash integration for production rate limiting and audit
export interface RedisConfig {
  url: string
  maxRetriesPerRequest: number
  retryDelayOnFailover: number
}

export class RedisStore {
  private redis: Redis | null = null
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    
    if (this.isProduction && process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxLoadingTimeout: 1000
      })

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error)
      })
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis) return null
    
    try {
      return await this.redis.get(key)
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value)
      } else {
        await this.redis.set(key, value)
      }
      return true
    } catch (error) {
      console.error('Redis SET error:', error)
      return false
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.redis) return 0
    
    try {
      return await this.redis.incr(key)
    } catch (error) {
      console.error('Redis INCR error:', error)
      return 0
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      await this.redis.expire(key, ttlSeconds)
      return true
    } catch (error) {
      console.error('Redis EXPIRE error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error('Redis DEL error:', error)
      return false
    }
  }

  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      await this.redis.zadd(key, score, member)
      return true
    } catch (error) {
      console.error('Redis ZADD error:', error)
      return false
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.redis) return []
    
    try {
      return await this.redis.zrange(key, start, stop)
    } catch (error) {
      console.error('Redis ZRANGE error:', error)
      return []
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.redis) return 0
    
    try {
      return await this.redis.lpush(key, ...values)
    } catch (error) {
      console.error('Redis LPUSH error:', error)
      return 0
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.redis) return []
    
    try {
      return await this.redis.lrange(key, start, stop)
    } catch (error) {
      console.error('Redis LRANGE error:', error)
      return []
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      await this.redis.ltrim(key, start, stop)
      return true
    } catch (error) {
      console.error('Redis LTRIM error:', error)
      return false
    }
  }

  isAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready'
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// Singleton instance
let redisStore: RedisStore | null = null

export function getRedisStore(): RedisStore {
  if (!redisStore) {
    redisStore = new RedisStore()
  }
  return redisStore
}

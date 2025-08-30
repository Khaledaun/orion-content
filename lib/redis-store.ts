import Redis from 'ioredis'

export class RedisStore {
  private redis: Redis | null = null
  private available: boolean = false

  constructor() {
    if (!process.env.REDIS_URL) {
      // Mock Redis for development
      this.available = false
      return
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true
      })
      this.available = true
    } catch (error) {
      console.warn('Redis connection failed, using mock:', error)
      this.available = false
    }
  }

  isAvailable(): boolean {
    return this.available && this.redis !== null
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null
    return await this.redis!.get(key)
  }

  async set(key: string, value: string, ttl?: number): Promise<string> {
    if (!this.isAvailable()) return 'OK'
    if (ttl) {
      return await this.redis!.setex(key, ttl, value)
    }
    return await this.redis!.set(key, value)
  }

  async del(key: string): Promise<number> {
    if (!this.isAvailable()) return 1
    return await this.redis!.del(key)
  }

  async ping(): Promise<string> {
    if (!this.isAvailable()) return 'PONG'
    return await this.redis!.ping()
  }

  async lpush(key: string, value: string): Promise<number> {
    if (!this.isAvailable()) return 1
    return await this.redis!.lpush(key, value)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isAvailable()) return []
    return await this.redis!.lrange(key, start, stop)
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (!this.isAvailable()) return 'OK'
    return await this.redis!.ltrim(key, start, stop)
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.isAvailable()) return 1
    return await this.redis!.expire(key, seconds)
  }

  async zrange(key: string, start: number | string, stop: number | string): Promise<string[]> {
    if (!this.isAvailable()) return []
    return await this.redis!.zrange(key, start, stop)
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isAvailable()) return 1
    return await this.redis!.zadd(key, score, member)
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    if (!this.isAvailable()) return 1
    return await this.redis!.zremrangebyscore(key, min, max)
  }
}

export function getRedisStore(): RedisStore {
  return new RedisStore()
}

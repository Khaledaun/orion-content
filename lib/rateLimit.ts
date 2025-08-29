type Bucket = { count: number; resetAt: number }
const memoryBuckets = new Map<string, Bucket>()
const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 100

export function rateKey(route: string, actor: string) {
  return `${route}:${actor || "anon"}`
}

export function rateLimit(route: string, actor: string) {
  const now = Date.now()
  const key = rateKey(route, actor)
  const b = memoryBuckets.get(key) || { count: 0, resetAt: now + WINDOW_MS }
  if (now > b.resetAt) { b.count = 0; b.resetAt = now + WINDOW_MS }
  b.count += 1
  memoryBuckets.set(key, b)
  const remaining = Math.max(0, LIMIT - b.count)
  const blocked = b.count > LIMIT
  return {
    blocked,
    headers: {
      "X-RateLimit-Limit": `${LIMIT}`,
      "X-RateLimit-Remaining": `${remaining}`,
      "X-RateLimit-Reset": `${Math.ceil((b.resetAt - now) / 1000)}`,
      ...(blocked ? { "Retry-After": `${Math.ceil((b.resetAt - now) / 1000)}` } : {}),
    },
  }
}

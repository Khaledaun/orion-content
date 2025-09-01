
import { getRedisStore } from './redis-store'

export interface AuditLogEntry {
  route: string
  actor: string
  action: string
  metadata?: Record<string, any>
  timestamp: string
  ip?: string
  userAgent?: string
  requestId?: string
  success?: boolean
  latencyMs?: number
  cost?: number
}

// PII redaction patterns (enhanced for Phase 8)
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /Bearer\s+[A-Za-z0-9+/=_-]+/gi, // Bearer tokens
  /password['":]?\s*['"]\w+['"]/gi, // passwords
  /sk-[A-Za-z0-9]{48,}/gi, // OpenAI API keys
  /pplx-[A-Za-z0-9]{32,}/gi, // Perplexity API keys
  /\b[A-Fa-f0-9]{32,}\b/g, // hex keys
]

const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'key', 'auth', 'credential',
  'apikey', 'api_key', 'bearer', 'authorization'
]

function redactPII(obj: any): any {
  if (typeof obj === 'string') {
    let result = obj
    PII_PATTERNS.forEach(pattern => {
      result = result.replace(pattern, '[REDACTED]')
    })
    return result
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactPII)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = redactPII(value)
      }
    }
    return result
  }
  
  return obj
}

export class ProductionAuditLogger {
  private redisStore = getRedisStore()
  private maxLogSize = parseInt(process.env.AUDIT_LOG_MAX_SIZE || '10000')
  
  async log(entry: Omit<AuditLogEntry, 'timestamp' | 'requestId'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      metadata: entry.metadata ? redactPII(entry.metadata) : undefined
    }
    
    // Always log to console with structured format
    console.log('AUDIT_LOG:', JSON.stringify(auditEntry))
    
    // In production, also store in Redis
    if (this.redisStore.isAvailable()) {
      try {
        const logKey = 'audit_logs'
        const entryJson = JSON.stringify(auditEntry)
        
        // Add to Redis list (most recent first)
        await this.redisStore.lpush(logKey, entryJson)
        
        // Keep only the most recent entries
        await this.redisStore.ltrim(logKey, 0, this.maxLogSize - 1)
        
        // Also create time-series index for queries
        const timeKey = `audit_time:${new Date().toISOString().substring(0, 10)}` // YYYY-MM-DD
        await this.redisStore.zadd(timeKey, Date.now(), auditEntry.requestId!)
        await this.redisStore.expire(timeKey, 7 * 24 * 3600) // Keep for 7 days
        
        // Route-specific indices for quick lookups
        const routeKey = `audit_route:${entry.route.replace(/[^a-zA-Z0-9]/g, '_')}`
        await this.redisStore.zadd(routeKey, Date.now(), auditEntry.requestId!)
        await this.redisStore.expire(routeKey, 24 * 3600) // Keep for 1 day
        
      } catch (error) {
        console.error('Failed to store audit log in Redis:', error)
      }
    }
    
    // Store critical security events in a separate high-priority log
    if (this.isCriticalEvent(entry)) {
      await this.logCriticalEvent(auditEntry)
    }
  }
  
  async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    if (!this.redisStore.isAvailable()) {
      return []
    }
    
    try {
      const logs = await this.redisStore.lrange('audit_logs', 0, limit - 1)
      return logs.map(log => JSON.parse(log))
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error)
      return []
    }
  }
  
  async getLogsByRoute(route: string, limit: number = 50): Promise<AuditLogEntry[]> {
    if (!this.redisStore.isAvailable()) {
      return []
    }
    
    try {
      const routeKey = `audit_route:${route.replace(/[^a-zA-Z0-9]/g, '_')}`
      const requestIds = await this.redisStore.zrange(routeKey, -limit, -1)
      
      const logs = await Promise.all(
        requestIds.map(async (requestId) => {
          const logEntries = await this.redisStore.lrange('audit_logs', 0, -1)
          const entry = logEntries.find(log => {
            const parsed = JSON.parse(log)
            return parsed.requestId === requestId
          })
          return entry ? JSON.parse(entry) : null
        })
      )
      
      return logs.filter(log => log !== null)
    } catch (error) {
      console.error('Failed to retrieve route logs:', error)
      return []
    }
  }
  
  async getSecurityEvents(limit: number = 100): Promise<AuditLogEntry[]> {
    if (!this.redisStore.isAvailable()) {
      return []
    }
    
    try {
      const logs = await this.redisStore.lrange('security_events', 0, limit - 1)
      return logs.map(log => JSON.parse(log))
    } catch (error) {
      console.error('Failed to retrieve security events:', error)
      return []
    }
  }
  
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`
  }
  
  private isCriticalEvent(entry: Omit<AuditLogEntry, 'timestamp' | 'requestId'>): boolean {
    const criticalActions = [
      'auth_failed', 'rate_limit_exceeded', 'security_violation',
      'admin_access', 'rulebook_updated', 'system_error'
    ]
    return criticalActions.includes(entry.action)
  }
  
  private async logCriticalEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await this.redisStore.lpush('security_events', JSON.stringify(entry))
      await this.redisStore.ltrim('security_events', 0, 1000) // Keep 1000 security events
      
      // In production, you might also want to:
      // - Send to security monitoring system
      // - Trigger alerts for specific events
      // - Write to secure audit files
      
      console.warn('CRITICAL_SECURITY_EVENT:', JSON.stringify(entry))
    } catch (error) {
      console.error('Failed to log critical security event:', error)
    }
  }
}

// Singleton instance
let auditLogger: ProductionAuditLogger | null = null

export function getAuditLogger(): ProductionAuditLogger {
  if (!auditLogger) {
    auditLogger = new ProductionAuditLogger()
  }
  return auditLogger
}

// Helper function for quick logging
export async function auditLog(entry: Omit<AuditLogEntry, 'timestamp' | 'requestId'>): Promise<void> {
  const logger = getAuditLogger()
  await logger.log(entry)
}

// Middleware helper for request tracking
export function createRequestAuditor(route: string) {
  return {
    start: Date.now(),
    log: async (
      action: string, 
      actor: string, 
      metadata?: Record<string, any>, 
      success: boolean = true,
      cost?: number
    ) => {
      const logger = getAuditLogger()
      await logger.log({
        route,
        action,
        actor,
        metadata,
        success,
        latencyMs: Date.now() - Date.now(),
        cost
      })
    }
  }
}

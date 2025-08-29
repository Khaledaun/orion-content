
export interface AuditLogEntry {
  route: string
  actor: string
  action: string
  metadata?: Record<string, any>
  timestamp: string
  ip?: string
}

// PII redaction patterns
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /Bearer\s+[A-Za-z0-9+/=_-]+/gi, // Bearer tokens
  /password['":]?\s*['"]\w+['"]/gi, // passwords
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
      // Redact sensitive keys
      if (['password', 'token', 'secret', 'key'].some(sensitive => 
        key.toLowerCase().includes(sensitive)
      )) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = redactPII(value)
      }
    }
    return result
  }
  
  return obj
}

export async function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const auditEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    metadata: entry.metadata ? redactPII(entry.metadata) : undefined
  }
  
  // In development, log to console with structure
  if (process.env.NODE_ENV !== 'production') {
    console.log('AUDIT_LOG:', JSON.stringify(auditEntry, null, 2))
    return
  }
  
  // In production, you might want to:
  // - Store in database audit table
  // - Send to logging service (DataDog, CloudWatch, etc.)
  // - Store in secure audit file
  
  // For now, structured console logging
  console.log('AUDIT_LOG:', JSON.stringify(auditEntry))
}

export function createAuditLogger(route: string) {
  return {
    log: (action: string, actor: string, metadata?: Record<string, any>, ip?: string) =>
      auditLog({ route, action, actor, metadata, ip })
  }
}

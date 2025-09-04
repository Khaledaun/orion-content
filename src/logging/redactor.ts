
/**
 * Logging Redactor for sensitive data protection
 * Phase 1: Content Management System
 */

const SENSITIVE_PATTERNS = [
  // API Keys and tokens
  /\b[A-Za-z0-9]{20,}\b/g,
  /sk-[A-Za-z0-9]{48}/g,
  /pk_[A-Za-z0-9]{24}/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  
  // Database URLs
  /postgresql:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  /mysql:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  /mongodb:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  
  // Email addresses (partial redaction)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Passwords and secrets
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /key["\s]*[:=]["\s]*[^"\s,}]+/gi,
  
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // Social Security Numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'key',
  'token',
  'auth',
  'credential',
  'private',
  'confidential',
  'sensitive',
  'valueEnc',
  'dataEnc',
];

/**
 * Redact sensitive information from a string
 */
export function redactString(input: string): string {
  let redacted = input;
  
  // Apply pattern-based redaction
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      if (match.length <= 4) {
        return '*'.repeat(match.length);
      }
      return match.substring(0, 2) + '*'.repeat(match.length - 4) + match.substring(match.length - 2);
    });
  }
  
  return redacted;
}

/**
 * Redact sensitive information from an object
 */
export function redactObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }
  
  if (typeof obj === 'object') {
    const redacted: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );
      
      if (isSensitive && typeof value === 'string') {
        redacted[key] = redactString(value);
      } else {
        redacted[key] = redactObject(value);
      }
    }
    
    return redacted;
  }
  
  return obj;
}

/**
 * Redact sensitive data from any input (main function)
 */
export function redactSensitiveData(data: any): any {
  try {
    return redactObject(data);
  } catch (error) {
    // If redaction fails, return a safe fallback
    return '[REDACTED - Error during redaction]';
  }
}

/**
 * Create a redacted logger wrapper
 */
export function createRedactedLogger(logger: Console = console) {
  return {
    log: (...args: any[]) => logger.log(...args.map(redactSensitiveData)),
    info: (...args: any[]) => logger.info(...args.map(redactSensitiveData)),
    warn: (...args: any[]) => logger.warn(...args.map(redactSensitiveData)),
    error: (...args: any[]) => logger.error(...args.map(redactSensitiveData)),
    debug: (...args: any[]) => logger.debug(...args.map(redactSensitiveData)),
  };
}

/**
 * Redact sensitive information from HTTP headers
 */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('authorization') || 
        lowerKey.includes('cookie') || 
        lowerKey.includes('token') ||
        lowerKey.includes('key')) {
      redacted[key] = redactString(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Redact sensitive information from URLs
 */
export function redactUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Redact password in URL
    if (urlObj.password) {
      urlObj.password = '***';
    }
    
    // Redact sensitive query parameters
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
    
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        const value = urlObj.searchParams.get(param);
        if (value) {
          urlObj.searchParams.set(param, redactString(value));
        }
      }
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, apply string redaction
    return redactString(url);
  }
}

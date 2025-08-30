
import pino from 'pino'
import { env } from './env'
import { scrubString, redactHttpObject } from './redact'

// Comprehensive redaction paths for Pino
const REDACT_PATHS = [
  // Request/Response redaction
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.headers["x-access-token"]',
  'req.body.password',
  'req.body.secret',
  'req.body.token',
  'req.body.apiKey',
  'req.body.api_key',
  'req.query.token',
  'req.query.key',
  'req.query.secret',
  'res.headers["set-cookie"]',
  
  // Generic sensitive fields
  'password',
  'secret',
  'token',
  'key',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  
  // Environment variables and config
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY',
  'ENCRYPTION_KEY',
  'SESSION_SECRET',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'WEBHOOK_SECRET',
  
  // PII fields
  'email',
  'emailAddress',
  'phone',
  'phoneNumber',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  
  // Nested object patterns (single level)
  '*.password',
  '*.secret',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.authorization',
  '*.email',
  '*.emailAddress'
]

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Comprehensive redaction configuration
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
    remove: false // Keep structure, just redact values
  },
  
  // Hooks for additional string scrubbing
  hooks: {
    logMethod(inputArgs: any[], method: any) {
      // Scrub any string arguments for patterns not caught by path redaction
      const scrubbedArgs = inputArgs.map(arg => {
        if (typeof arg === 'string') {
          return scrubString(arg, '[REDACTED]')
        }
        return arg
      })
      return method.apply(this, scrubbedArgs)
    }
  },
  
  // Custom serializers for request/response objects
  serializers: {
    req: (req) => {
      return redactHttpObject({
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params
      })
    },
    res: (res) => {
      return redactHttpObject({
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body
      })
    },
    err: pino.stdSerializers.err
  },
  
  // Standard formatters
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => ({
      ...object,
      timestamp: new Date().toISOString(),
      service: 'orion-content'
    })
  },
  
  // Pretty printing for development
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard'
      }
    }
  })
})

export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId })
}

// Export a safe console replacement that uses our redacted logger
export const safeConsole = {
  log: (message: string, ...args: any[]) => logger.info(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args)
}

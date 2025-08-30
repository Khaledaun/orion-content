import pino from 'pino'

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.apiKey',
  'req.body.token',
  'req.body.password',
  'res.requestHeaders.authorization',
  '*.apiKey',
  '*.token',
  '*.password',
  '*.secret'
]

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: REDACT_PATHS, censor: '***REDACTED***', remove: false },
  serializers: {
    req(req: any) {
      return {
        method: req.method,
        url: req.url,
        headers: {
          ...req.headers,
          authorization: req.headers?.authorization ? '***REDACTED***' : undefined,
          cookie: req.headers?.cookie ? '***REDACTED***' : undefined
        }
      }
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
        headers: res.headers
      }
    }
  }
})

export function redactSecrets<T>(input: T): T {
  const json = JSON.stringify(input)
  const scrubbed = json
    .replace(/(sk-[A-Za-z0-9-_]{20,})/g, '[REDACTED]')
    .replace(/(pk-[A-Za-z0-9-_]{12,})/g, '[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9\.\-_]+/gi, 'Bearer [REDACTED]')
    .replace(/"?(api[_-]?key|token|password|secret|client_secret|private_key|refresh_token)"?\s*:\s*"[^"]+"/gi, '"$1":"[REDACTED]"')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/-----BEGIN[\s\S]+?PRIVATE KEY-----[\s\S]+?END [\s\S]+?KEY-----/g, '[REDACTED_KEY]')
  return JSON.parse(scrubbed)
}

export function redactHttpObject(obj: any): any {
  return redactSecrets(obj)
}

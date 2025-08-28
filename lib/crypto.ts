
import { randomBytes, createCipherGCM, createDecipherGCM } from 'crypto'

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return Buffer.from(key, 'base64')
}

export function encryptJson(obj: unknown): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipherGCM('aes-256-gcm', key)
  cipher.setAAD(Buffer.from('orion-content'))
  
  const jsonString = JSON.stringify(obj)
  let encrypted = cipher.update(jsonString, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const tag = cipher.getAuthTag()
  
  // Combine IV, tag, and encrypted data
  const result = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'), 
    data: encrypted
  }
  
  return Buffer.from(JSON.stringify(result)).toString('base64')
}

export function decryptJson<T>(encString: string): T {
  const key = getEncryptionKey()
  
  try {
    const combined = JSON.parse(Buffer.from(encString, 'base64').toString())
    const iv = Buffer.from(combined.iv, 'base64')
    const tag = Buffer.from(combined.tag, 'base64')
    const data = combined.data
    
    const decipher = createDecipherGCM('aes-256-gcm', key)
    decipher.setAAD(Buffer.from('orion-content'))
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted) as T
  } catch (error) {
    throw new Error('Failed to decrypt data')
  }
}

export function generateApiToken(): string {
  const b64 = randomBytes(32).toString('base64');
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}


import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// AES-256-GCM for tamper-evident encryption (Phase 8 upgrade)
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return key
}

export interface EncryptedData {
  iv: string
  authTag: string
  encrypted: string
}

export function encryptJson(obj: unknown): string {
  const key = Buffer.from(getEncryptionKey(), 'base64')
  const iv = randomBytes(16) // 128-bit IV for GCM
  const plaintext = JSON.stringify(obj)
  
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  const result: EncryptedData = {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted
  }
  
  return Buffer.from(JSON.stringify(result)).toString('base64')
}

export function decryptJson(encryptedData: string): unknown {
  try {
    const key = Buffer.from(getEncryptionKey(), 'base64')
    const data: EncryptedData = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'))
    
    const iv = Buffer.from(data.iv, 'hex')
    const authTag = Buffer.from(data.authTag, 'hex')
    const encrypted = data.encrypted
    
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  } catch (error) {
    throw new Error('Failed to decrypt data - possible tampering detected')
  }
}

// Utility for encrypting sensitive strings
export function encryptString(plaintext: string): string {
  return encryptJson(plaintext)
}

export function decryptString(encryptedData: string): string {
  return decryptJson(encryptedData) as string
}

// Key rotation support
export function rotateEncryptionKey(oldEncryptedData: string, newKey?: string): string {
  // Decrypt with current key
  const decrypted = decryptJson(oldEncryptedData)
  
  // Re-encrypt with new key (or current if newKey not provided)
  if (newKey) {
    const originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = newKey
    const reencrypted = encryptJson(decrypted)
    process.env.ENCRYPTION_KEY = originalKey
    return reencrypted
  }
  
  return encryptJson(decrypted)
}

// Validation for encrypted data integrity
export function validateEncryptedData(encryptedData: string): boolean {
  try {
    const data: EncryptedData = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'))
    return !!(data.iv && data.authTag && data.encrypted)
  } catch {
    return false
  }
}

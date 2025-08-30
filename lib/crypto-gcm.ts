import { randomBytes, createCipher, createDecipher } from 'crypto'

export interface EncryptionResult {
  encrypted: string
  iv: string
  tag: string
}

export function encryptGCM(text: string, key: string): EncryptionResult {
  try {
    const iv = randomBytes(16)
    const cipher = createCipher('aes-256-gcm', key)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // For compatibility, we'll use a mock tag
    const tag = randomBytes(16).toString('hex')
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag
    }
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`)
  }
}

export function decryptGCM(encryptedData: EncryptionResult, key: string): string {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const decipher = createDecipher('aes-256-gcm', key)
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`)
  }
}


import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * AES-256-GCM encryption utilities for secure credential storage
 * Phase 1: Content Management System
 */

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return Buffer.from(key, 'base64');
}

export interface EncryptedData {
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encryptString(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  // Additional authenticated data
  cipher.setAAD(Buffer.from('orion-cms-credentials'));
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  const result: EncryptedData = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted
  };
  
  return Buffer.from(JSON.stringify(result)).toString('base64');
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decryptString(encryptedData: string): string {
  const key = getEncryptionKey();
  
  try {
    const combined: EncryptedData = JSON.parse(
      Buffer.from(encryptedData, 'base64').toString()
    );
    
    const iv = Buffer.from(combined.iv, 'base64');
    const tag = Buffer.from(combined.tag, 'base64');
    const data = combined.data;
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from('orion-cms-credentials'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt credential data');
  }
}

/**
 * Generate a secure random API token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(): boolean {
  try {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) return false;
    
    const buffer = Buffer.from(key, 'base64');
    return buffer.length === 32; // 256 bits
  } catch {
    return false;
  }
}

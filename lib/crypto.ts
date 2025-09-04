
/**
 * Phase 1: AES-GCM encryption utilities for secure credential storage
 */

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

/**
 * Generate a random API token
 */
export function generateApiToken(): string {
  return generateKey();
}

/**
 * Encrypt JSON data
 */
export async function encryptJson(data: any, key: string): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encrypted = await encryptData(jsonString, key);
  return JSON.stringify(encrypted);
}

/**
 * Generate a random encryption key
 */
export function generateKey(): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string, key: string): Promise<EncryptedData> {
  if (typeof window !== 'undefined') {
    // Browser environment
    const keyBuffer = new Uint8Array(key.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedData
    );

    const encryptedArray = new Uint8Array(encrypted);
    const tag = encryptedArray.slice(-16);
    const ciphertext = encryptedArray.slice(0, -16);

    return {
      data: Array.from(ciphertext, byte => byte.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv, byte => byte.toString(16).padStart(2, '0')).join(''),
      tag: Array.from(tag, byte => byte.toString(16).padStart(2, '0')).join('')
    };
  } else {
    // Node.js environment
    const crypto = require('crypto');
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipher('aes-256-gcm');
    cipher.setAAD(Buffer.alloc(0));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedData: EncryptedData, key: string): Promise<string> {
  if (typeof window !== 'undefined') {
    // Browser environment
    const keyBuffer = new Uint8Array(key.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = new Uint8Array(encryptedData.iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(encryptedData.data.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const tag = new Uint8Array(encryptedData.tag.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      combined
    );

    return new TextDecoder().decode(decrypted);
  } else {
    // Node.js environment
    const crypto = require('crypto');
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm');
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.alloc(0));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

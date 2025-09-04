
/**
 * Phase 1: LocalStorage utilities for client-side credential management
 */

export interface StoredCredential {
  id: string;
  name: string;
  type: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'orion_credentials';

/**
 * Get all stored credentials from localStorage
 */
export function getStoredCredentials(): StoredCredential[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse stored credentials:', error);
    return [];
  }
}

/**
 * Store a credential in localStorage
 */
export function storeCredential(credential: Omit<StoredCredential, 'createdAt' | 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  
  const credentials = getStoredCredentials();
  const now = new Date().toISOString();
  
  const existingIndex = credentials.findIndex(c => c.id === credential.id);
  const newCredential: StoredCredential = {
    ...credential,
    createdAt: existingIndex >= 0 ? credentials[existingIndex].createdAt : now,
    updatedAt: now
  };
  
  if (existingIndex >= 0) {
    credentials[existingIndex] = newCredential;
  } else {
    credentials.push(newCredential);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

/**
 * Remove a credential from localStorage
 */
export function removeCredential(id: string): void {
  if (typeof window === 'undefined') return;
  
  const credentials = getStoredCredentials();
  const filtered = credentials.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get a specific credential by ID
 */
export function getCredential(id: string): StoredCredential | null {
  const credentials = getStoredCredentials();
  return credentials.find(c => c.id === id) || null;
}

/**
 * Clear all stored credentials
 */
export function clearAllCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

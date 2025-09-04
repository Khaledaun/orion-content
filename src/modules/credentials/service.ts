
import { PrismaClient } from '@prisma/client';
import { encryptString, decryptString } from '../../lib/crypto/aesGcm';
import { CreateCredentialInput, UpdateCredentialInput } from './dto';

/**
 * Credential Service for secure API key management
 * Phase 1: Content Management System
 */

export class CredentialService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new credential with encrypted storage
   */
  async createCredential(input: CreateCredentialInput) {
    const { value, ...rest } = input;
    
    // Check if key already exists
    const existing = await this.prisma.credential.findUnique({
      where: { key: input.key }
    });
    
    if (existing) {
      throw new Error(`Credential with key '${input.key}' already exists`);
    }
    
    // Encrypt the value
    const valueEnc = encryptString(value);
    
    const credential = await this.prisma.credential.create({
      data: {
        ...rest,
        valueEnc,
      },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return credential;
  }

  /**
   * Get all credentials (without decrypted values)
   */
  async getAllCredentials() {
    return this.prisma.credential.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a credential by ID (without decrypted value)
   */
  async getCredentialById(id: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!credential) {
      throw new Error('Credential not found');
    }
    
    return credential;
  }

  /**
   * Get decrypted credential value by key (for internal use)
   */
  async getCredentialValue(key: string): Promise<string | null> {
    const credential = await this.prisma.credential.findUnique({
      where: { key, isActive: true },
      select: { valueEnc: true },
    });
    
    if (!credential) {
      return null;
    }
    
    try {
      return decryptString(credential.valueEnc);
    } catch (error) {
      console.error(`Failed to decrypt credential '${key}':`, error);
      return null;
    }
  }

  /**
   * Update a credential
   */
  async updateCredential(id: string, input: UpdateCredentialInput) {
    const { value, ...rest } = input;
    
    // Check if credential exists
    const existing = await this.prisma.credential.findUnique({
      where: { id }
    });
    
    if (!existing) {
      throw new Error('Credential not found');
    }
    
    // If updating key, check for conflicts
    if (input.key && input.key !== existing.key) {
      const keyExists = await this.prisma.credential.findUnique({
        where: { key: input.key }
      });
      
      if (keyExists) {
        throw new Error(`Credential with key '${input.key}' already exists`);
      }
    }
    
    const updateData: any = { ...rest };
    
    // Encrypt new value if provided
    if (value) {
      updateData.valueEnc = encryptString(value);
    }
    
    const credential = await this.prisma.credential.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return credential;
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id }
    });
    
    if (!credential) {
      throw new Error('Credential not found');
    }
    
    await this.prisma.credential.delete({
      where: { id }
    });
    
    return { success: true };
  }

  /**
   * Test a credential by making a simple API call
   */
  async testCredential(key: string, testEndpoint?: string): Promise<{ success: boolean; message: string }> {
    const value = await this.getCredentialValue(key);
    
    if (!value) {
      return { success: false, message: 'Credential not found or inactive' };
    }
    
    // Basic validation - check if it looks like an API key
    if (value.length < 10) {
      return { success: false, message: 'Credential value appears to be too short' };
    }
    
    // If a test endpoint is provided, make a simple request
    if (testEndpoint) {
      try {
        const response = await fetch(testEndpoint, {
          headers: {
            'Authorization': `Bearer ${value}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          return { success: true, message: 'Credential test successful' };
        } else {
          return { success: false, message: `Test failed with status: ${response.status}` };
        }
      } catch (error) {
        return { success: false, message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    }
    
    return { success: true, message: 'Credential format appears valid' };
  }
}

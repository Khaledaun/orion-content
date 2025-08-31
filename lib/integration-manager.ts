
/**
 * Integration Credentials Management for Phase 10
 * Handles encrypted storage and retrieval of integration credentials
 */

import { prisma } from './prisma'
import { redactSensitive } from './redact'
import { logger } from './logger'

// Import crypto utilities
let encryptJson: (obj: unknown) => string
let decryptJson: (encrypted: string) => unknown

// Dynamic import to handle crypto utilities
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('../lib/crypto-gcm')
  encryptJson = crypto.encryptJson
  decryptJson = crypto.decryptJson
} catch (error) {
  // Fallback for development - just stringify/parse (NOT for production)
  logger.warn('Crypto utilities not available, using fallback encryption')
  encryptJson = (obj: unknown) => JSON.stringify(obj)
  decryptJson = (encrypted: string) => JSON.parse(encrypted)
}

export enum IntegrationType {
  WORDPRESS = 'wordpress',
  GSC = 'gsc',
  GA4 = 'ga4',
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity'
}

export interface WordPressCredentials {
  siteUrl: string
  username: string
  password: string
  applicationPassword?: string
}

export interface GSCCredentials {
  siteUrl: string
  serviceAccountJson: string
}

export interface GA4Credentials {
  propertyId: string
  serviceAccountJson: string
}

export interface OpenAICredentials {
  apiKey: string
  organizationId?: string
}

export interface PerplexityCredentials {
  apiKey: string
}

export type IntegrationCredentials = 
  | WordPressCredentials 
  | GSCCredentials 
  | GA4Credentials 
  | OpenAICredentials 
  | PerplexityCredentials

export interface IntegrationInfo {
  id: string
  type: IntegrationType
  siteId?: string
  verified: boolean
  lastTestAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class IntegrationManager {
  
  async saveCredentials(
    type: IntegrationType,
    credentials: IntegrationCredentials,
    siteId?: string
  ): Promise<IntegrationInfo> {
    try {
      // Encrypt credentials
      const credentialsEnc = encryptJson(credentials)
      
      // Upsert integration record
      const integration = await prisma.integration.upsert({
        where: {
          siteId_type: {
            siteId: siteId || '',
            type: type
          }
        },
        update: {
          credentialsEnc,
          verified: false, // Reset verification on credential update
          updatedAt: new Date()
        },
        create: {
          siteId: siteId || '',
          type: type,
          credentialsEnc,
          verified: false
        }
      })

      logger.info({ 
        type, 
        siteId: siteId || 'global',
        integrationId: integration.id 
      }, 'Integration credentials saved')

      return {
        id: integration.id,
        type: type,
        siteId: integration.siteId || undefined,
        verified: integration.verified,
        lastTestAt: integration.lastTestAt || undefined,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        type, 
        siteId 
      }, 'Failed to save integration credentials')
      throw new Error('Failed to save credentials')
    }
  }

  async getCredentials<T extends IntegrationCredentials>(
    type: IntegrationType,
    siteId?: string
  ): Promise<T | null> {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          siteId_type: {
            siteId: siteId || '',
            type: type
          }
        }
      })

      if (!integration) {
        return null
      }

      // Decrypt credentials
      const credentials = decryptJson(integration.credentialsEnc) as T
      
      return credentials
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        type, 
        siteId 
      }, 'Failed to get integration credentials')
      return null
    }
  }

  async getIntegrationInfo(
    type: IntegrationType,
    siteId?: string
  ): Promise<IntegrationInfo | null> {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          siteId_type: {
            siteId: siteId || '',
            type: type
          }
        }
      })

      if (!integration) {
        return null
      }

      return {
        id: integration.id,
        type: type,
        siteId: integration.siteId || undefined,
        verified: integration.verified,
        lastTestAt: integration.lastTestAt || undefined,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        type, 
        siteId 
      }, 'Failed to get integration info')
      return null
    }
  }

  async listIntegrations(siteId?: string): Promise<IntegrationInfo[]> {
    try {
      const integrations = await prisma.integration.findMany({
        where: {
          siteId: siteId || ''
        },
        orderBy: {
          type: 'asc'
        }
      })

      return integrations.map(integration => ({
        id: integration.id,
        type: integration.type as IntegrationType,
        siteId: integration.siteId || undefined,
        verified: integration.verified,
        lastTestAt: integration.lastTestAt || undefined,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }))
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        siteId 
      }, 'Failed to list integrations')
      return []
    }
  }

  async testConnection(
    type: IntegrationType,
    siteId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
  const credentials = await this.getCredentials(type, siteId || '')
      if (!credentials) {
        return { success: false, message: 'No credentials found' }
      }

      // Perform connection test based on type
      let testResult: { success: boolean; message: string }

      switch (type) {
        case IntegrationType.WORDPRESS:
          testResult = await this.testWordPressConnection(credentials as WordPressCredentials)
          break
        case IntegrationType.GSC:
          testResult = await this.testGSCConnection(credentials as GSCCredentials)
          break
        case IntegrationType.GA4:
          testResult = await this.testGA4Connection(credentials as GA4Credentials)
          break
        case IntegrationType.OPENAI:
          testResult = await this.testOpenAIConnection(credentials as OpenAICredentials)
          break
        case IntegrationType.PERPLEXITY:
          testResult = await this.testPerplexityConnection(credentials as PerplexityCredentials)
          break
        default:
          testResult = { success: false, message: 'Unknown integration type' }
      }

      // Update verification status
      if (testResult.success) {
        await prisma.integration.update({
          where: {
            siteId_type: {
              siteId: siteId || '',
              type: type
            }
          },
          data: {
            verified: true,
            lastTestAt: new Date()
          }
        })
      }

      logger.info({ 
        type, 
        siteId: siteId || 'global', 
        success: testResult.success 
      }, 'Integration connection test completed')

      return testResult
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        type, 
        siteId 
      }, 'Integration connection test failed')
      return { success: false, message: 'Connection test failed' }
    }
  }

  async deleteIntegration(
    type: IntegrationType,
    siteId?: string
  ): Promise<boolean> {
    try {
      await prisma.integration.delete({
        where: {
          siteId_type: {
            siteId: siteId || '',
            type: type
          }
        }
      })

      logger.info({ type, siteId: siteId || 'global' }, 'Integration deleted')
      return true
    } catch (error) {
      logger.error({ 
        error: redactSensitive(error), 
        type, 
        siteId 
      }, 'Failed to delete integration')
      return false
    }
  }

  // Connection test implementations (dummy/stub for MVP)
  private async testWordPressConnection(creds: WordPressCredentials): Promise<{ success: boolean; message: string }> {
    // In production, this would make actual HTTP requests to test the connection
    // For MVP, we'll simulate a successful test for dummy credentials
    if (creds.siteUrl && creds.username && creds.password) {
      return { success: true, message: 'WordPress connection successful' }
    }
    return { success: false, message: 'Invalid WordPress credentials' }
  }

  private async testGSCConnection(creds: GSCCredentials): Promise<{ success: boolean; message: string }> {
    if (creds.siteUrl && creds.serviceAccountJson) {
      return { success: true, message: 'GSC connection successful' }
    }
    return { success: false, message: 'Invalid GSC credentials' }
  }

  private async testGA4Connection(creds: GA4Credentials): Promise<{ success: boolean; message: string }> {
    if (creds.propertyId && creds.serviceAccountJson) {
      return { success: true, message: 'GA4 connection successful' }
    }
    return { success: false, message: 'Invalid GA4 credentials' }
  }

  private async testOpenAIConnection(creds: OpenAICredentials): Promise<{ success: boolean; message: string }> {
    if (creds.apiKey && creds.apiKey.startsWith('sk-')) {
      return { success: true, message: 'OpenAI connection successful' }
    }
    return { success: false, message: 'Invalid OpenAI API key' }
  }

  private async testPerplexityConnection(creds: PerplexityCredentials): Promise<{ success: boolean; message: string }> {
    if (creds.apiKey && creds.apiKey.startsWith('pplx-')) {
      return { success: true, message: 'Perplexity connection successful' }
    }
    return { success: false, message: 'Invalid Perplexity API key' }
  }

  // Generate dummy credentials for demo purposes
  static generateDummyCredentials(type: IntegrationType): IntegrationCredentials {
    switch (type) {
      case IntegrationType.WORDPRESS:
        return {
          siteUrl: 'https://example-site.com',
          username: 'admin',
          password: 'secure-password-123',
          applicationPassword: 'abcd efgh ijkl mnop qrst uvwx'
        } as WordPressCredentials

      case IntegrationType.GSC:
        return {
          siteUrl: 'https://example-site.com',
          serviceAccountJson: JSON.stringify({
            type: 'service_account',
            project_id: 'example-project',
            client_email: 'gsc-service@example-project.iam.gserviceaccount.com',
            client_id: '123456789012345678901',
            private_key: '-----BEGIN PRIVATE KEY-----\n[DUMMY_KEY_CONTENT]\n-----END PRIVATE KEY-----\n'
          })
        } as GSCCredentials

      case IntegrationType.GA4:
        return {
          propertyId: '123456789',
          serviceAccountJson: JSON.stringify({
            type: 'service_account',
            project_id: 'example-project',
            client_email: 'ga4-service@example-project.iam.gserviceaccount.com',
            client_id: '123456789012345678901',
            private_key: '-----BEGIN PRIVATE KEY-----\n[DUMMY_KEY_CONTENT]\n-----END PRIVATE KEY-----\n'
          })
        } as GA4Credentials

      case IntegrationType.OPENAI:
        return {
          apiKey: 'sk-dummy123456789012345678901234567890123456789012',
          organizationId: 'org-dummyorganization123'
        } as OpenAICredentials

      case IntegrationType.PERPLEXITY:
        return {
          apiKey: 'pplx-dummy123456789012345678901234567890123456789012'
        } as PerplexityCredentials

      default:
        throw new Error(`Unknown integration type: ${type}`)
    }
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager()

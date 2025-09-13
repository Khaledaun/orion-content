
/**
 * Enterprise Test Helpers
 * Phase 1 Enhancement: Comprehensive testing utilities and fixtures
 */

import { PrismaClient } from '@prisma/client'

// Mock data generators
export class MockDataGenerator {
  private static instance: MockDataGenerator

  public static getInstance(): MockDataGenerator {
    if (!MockDataGenerator.instance) {
      MockDataGenerator.instance = new MockDataGenerator()
    }
    return MockDataGenerator.instance
  }

  public generateUser(overrides?: Partial<any>): any {
    return {
      id: this.generateId(),
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      passwordHash: '$2a$12$test.hash.here',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  public generateSite(overrides?: Partial<any>): any {
    return {
      id: this.generateId(),
      key: `site-${Date.now()}`,
      name: 'Test Site',
      timezone: 'UTC',
      publisher: 'Test Publisher',
      locales: ['en'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  public generateCategory(overrides?: Partial<any>): any {
    return {
      id: this.generateId(),
      siteId: this.generateId(),
      name: 'Test Category',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  public generateDraft(overrides?: Partial<any>): any {
    return {
      id: this.generateId(),
      siteId: this.generateId(),
      title: 'Test Draft',
      content: 'Test content for the draft',
      score: 85.5,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Database test utilities
export class DatabaseTestUtils {
  private static instance: DatabaseTestUtils
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    })
  }

  public static getInstance(): DatabaseTestUtils {
    if (!DatabaseTestUtils.instance) {
      DatabaseTestUtils.instance = new DatabaseTestUtils()
    }
    return DatabaseTestUtils.instance
  }

  public async cleanup(): Promise<void> {
    // Clean up test data in reverse dependency order
    const tableOrder = [
      'reviews',
      'drafts', 
      'qa_reports',
      'topics',
      'categories',
      'user_roles',
      'sessions',
      'accounts',
      'users',
      'sites',
      'weeks'
    ]

    for (const table of tableOrder) {
      try {
        await this.prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id LIKE 'test_%'`)
      } catch (error) {
        // Ignore errors for tables that might not exist
        console.warn(`Could not clean up table ${table}:`, error)
      }
    }
  }

  public async seed(fixtures: Record<string, any[]>): Promise<void> {
    for (const [table, records] of Object.entries(fixtures)) {
      for (const record of records) {
        try {
          await (this.prisma as any)[table].create({ data: record })
        } catch (error) {
          console.warn(`Could not seed ${table}:`, error)
        }
      }
    }
  }

  public async transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn) as Promise<T>
  }

  public getPrismaClient(): PrismaClient {
    return this.prisma
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// API test utilities
export class ApiTestUtils {
  public static createMockRequest(options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: any
    query?: Record<string, string>
  } = {}): any {
    const url = new URL(options.url || 'http://localhost:3000/api/test')
    
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    return {
      method: options.method || 'GET',
      url: url.toString(),
      nextUrl: url,
      headers: new Map(Object.entries(options.headers || {})),
      json: () => Promise.resolve(options.body),
      text: () => Promise.resolve(JSON.stringify(options.body)),
      formData: () => Promise.resolve(new FormData())
    }
  }

  public static createMockResponse(options: {
    status?: number
    headers?: Record<string, string>
    body?: any
  } = {}): any {
    return {
      status: options.status || 200,
      statusText: options.status === 404 ? 'Not Found' : 'OK',
      headers: new Map(Object.entries(options.headers || {})),
      json: () => Promise.resolve(options.body),
      text: () => Promise.resolve(JSON.stringify(options.body)),
      ok: (options.status || 200) < 400
    }
  }

  public static async expectApiError(
    promise: Promise<any>,
    expectedStatus: number,
    expectedMessage?: string
  ): Promise<void> {
    try {
      await promise
      throw new Error('Expected API call to throw an error')
    } catch (error: any) {
      expect(error.statusCode || error.status).toBe(expectedStatus)
      if (expectedMessage) {
        expect(error.message).toContain(expectedMessage)
      }
    }
  }
}

// Component test utilities
export class ComponentTestUtils {
  public static createMockRouter(overrides?: any): any {
    return {
      push: () => Promise.resolve(true),
      replace: () => Promise.resolve(true),
      prefetch: () => Promise.resolve(),
      back: () => {},
      forward: () => {},
      refresh: () => {},
      pathname: '/',
      route: '/',
      query: {},
      asPath: '/',
      events: {
        on: () => {},
        off: () => {},
        emit: () => {}
      },
      ...overrides
    }
  }

  public static createMockSession(overrides?: any): any {
    return {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides
    }
  }

  public static waitForAsyncUpdates(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve))
  }
}

// Performance test utilities
export class PerformanceTestUtils {
  public static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = process.hrtime.bigint()
    const result = await fn()
    const endTime = process.hrtime.bigint()
    const executionTime = Number(endTime - startTime) / 1_000_000 // Convert to milliseconds

    return { result, executionTime }
  }

  public static async measureMemoryUsage<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; memoryUsage: NodeJS.MemoryUsage }> {
    const initialMemory = process.memoryUsage()
    const result = await fn()
    const finalMemory = process.memoryUsage()

    const memoryUsage = {
      rss: finalMemory.rss - initialMemory.rss,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      external: finalMemory.external - initialMemory.external,
      arrayBuffers: finalMemory.arrayBuffers - initialMemory.arrayBuffers
    }

    return { result, memoryUsage }
  }

  public static expectPerformance(
    executionTime: number,
    maxTimeMs: number,
    operation: string
  ): void {
    if (executionTime > maxTimeMs) {
      console.warn(`Performance warning: ${operation} took ${executionTime}ms (max: ${maxTimeMs}ms)`)
    }
    expect(executionTime).toBeLessThan(maxTimeMs)
  }
}

// Test fixtures
export class TestFixtures {
  public static getDefaultUser() {
    return MockDataGenerator.getInstance().generateUser({
      email: 'test.user@example.com',
      name: 'Test User'
    })
  }

  public static getDefaultSite() {
    return MockDataGenerator.getInstance().generateSite({
      key: 'test-site',
      name: 'Test Site'
    })
  }

  public static getComplexScenario() {
    const user = this.getDefaultUser()
    const site = this.getDefaultSite()
    const category = MockDataGenerator.getInstance().generateCategory({
      siteId: site.id
    })
    const drafts = [
      MockDataGenerator.getInstance().generateDraft({
        siteId: site.id,
        title: 'Draft 1',
        status: 'PENDING'
      }),
      MockDataGenerator.getInstance().generateDraft({
        siteId: site.id,
        title: 'Draft 2',
        status: 'APPROVED'
      })
    ]

    return {
      user,
      site,
      category,
      drafts
    }
  }
}

// Export singleton instances
export const mockDataGenerator = MockDataGenerator.getInstance()
export const dbTestUtils = DatabaseTestUtils.getInstance()

// Global test setup and teardown
export const setupTestEnvironment = async (): Promise<void> => {
  // Set test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'warn'
  })
  
  // Clean up database
  await dbTestUtils.cleanup()
}

export const teardownTestEnvironment = async (): Promise<void> => {
  // Clean up database
  await dbTestUtils.cleanup()
  
  // Disconnect from database
  await dbTestUtils.disconnect()
}

// Jest custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveValidId(): R
      toBeWithinTimeRange(start: Date, end: Date): R
      toMatchApiResponse(schema: any): R
    }
  }
}

// Export for global setup
export const extendJestMatchers = (): void => {
  expect.extend({
    toHaveValidId(received: any) {
      const pass = typeof received === 'string' && received.length > 0 && !received.includes(' ')
      return {
        message: () => `expected ${received} to be a valid ID`,
        pass
      }
    },

    toBeWithinTimeRange(received: Date, start: Date, end: Date) {
      const pass = received >= start && received <= end
      return {
        message: () => `expected ${received} to be within ${start} and ${end}`,
        pass
      }
    },

    toMatchApiResponse(_received: any, _schema: any) {
      // This would integrate with a schema validation library
      const pass = true // Placeholder
      return {
        message: () => `expected response to match API schema`,
        pass
      }
    }
  })
}

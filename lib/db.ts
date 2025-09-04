
// Build-time safe database client
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL

let PrismaClient: any

if (isBuildTime) {
  // Mock client for build time
  PrismaClient = class MockPrismaClient {
    constructor() {}
    $queryRaw = () => Promise.resolve([{ result: 'mock' }])
    $disconnect = () => Promise.resolve()
  }
} else {
  try {
    PrismaClient = require('@prisma/client').PrismaClient
  } catch (error) {
    console.warn('Prisma client not available:', error)
    PrismaClient = class MockPrismaClient {
      constructor() {}
      $queryRaw = () => Promise.resolve([{ result: 'mock' }])
      $disconnect = () => Promise.resolve()
    }
  }
}

// Runtime detection for Edge vs Node.js
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined'
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

// Database configuration modes
type DbMode = 'accelerate' | 'direct' | 'local' | 'neon-serverless'

function getDbMode(): DbMode {
  if (process.env.DB_MODE) {
    return process.env.DB_MODE as DbMode
  }
  
  // Auto-detect based on environment
  if (isEdgeRuntime) return 'accelerate'
  if (isServerless) return 'neon-serverless'
  if (process.env.NODE_ENV === 'development') return 'local'
  return 'direct'
}

// Connection string validation
function validateConnectionString(url: string | undefined, type: string): string {
  if (!url) {
    throw new Error(`Missing ${type} connection string. Check your environment variables.`)
  }
  
  // Basic URL validation
  try {
    new URL(url)
  } catch {
    throw new Error(`Invalid ${type} connection string format`)
  }
  
  return url
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  mode: DbMode
  latency?: number
  error?: string
}> {
  const mode = getDbMode()
  const startTime = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - startTime
    
    return {
      status: 'healthy',
      mode,
      latency
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      mode,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Prisma client factory with runtime-specific configuration
function createPrismaClient(): any {
  const mode = getDbMode()
  
  switch (mode) {
    case 'accelerate': {
      // Use Prisma Accelerate for Edge runtime
      const accelerateUrl = validateConnectionString(
        process.env.DATABASE_URL,
        'Prisma Accelerate'
      )
      
      if (!accelerateUrl.includes('prisma://')) {
        throw new Error('DATABASE_URL must be a Prisma Accelerate connection string (prisma://...)')
      }
      
      return new PrismaClient({
        datasources: {
          db: { url: accelerateUrl }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
      })
    }
    
    case 'neon-serverless': {
      // Use Neon serverless driver for better serverless compatibility
      const neonUrl = validateConnectionString(
        process.env.DATABASE_URL,
        'Neon serverless'
      )
      
      return new PrismaClient({
        datasources: {
          db: { url: neonUrl }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
      })
    }
    
    case 'local': {
      // Local PostgreSQL for development
      const localUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orion_dev'
      
      return new PrismaClient({
        datasources: {
          db: { url: localUrl }
        },
        log: ['query', 'error', 'warn', 'info']
      })
    }
    
    case 'direct':
    default: {
      // Direct connection for traditional deployments
      const directUrl = validateConnectionString(
        process.env.DATABASE_URL,
        'direct database'
      )
      
      return new PrismaClient({
        datasources: {
          db: { url: directUrl }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
      })
    }
  }
}

// Global singleton pattern for serverless environments
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

// Export database mode for debugging
export const dbMode = getDbMode()
export const dbInfo = {
  mode: dbMode,
  isEdgeRuntime,
  isServerless,
  nodeEnv: process.env.NODE_ENV
}

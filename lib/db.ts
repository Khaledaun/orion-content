import { PrismaClient } from '@prisma/client'

// Global Prisma instance for connection pooling
declare global {
  var prisma: PrismaClient | undefined
}

// Graceful Prisma client creation with fallbacks
function createPrismaClient(): PrismaClient | null {
  try {
    // Check if we have a valid database URL
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
      console.warn('No database URL configured, skipping Prisma client creation')
      return null
    }

    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    return null
  }
}

// Runtime detection for Edge vs Node.js
const isEdgeRuntime = typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

// Database configuration modes
type DbMode = 'accelerate' | 'direct' | 'local' | 'neon-serverless'

function getDbMode(): DbMode {
  if (process.env.DB_MODE) {
    return process.env.DB_MODE as DbMode
  }

  // Auto-detect based on environment
  if (isEdgeRuntime) return 'accelerate'
  if (process.env.POSTGRES_PRISMA_URL) return 'neon-serverless'
  if (isServerless) return 'accelerate'
  if (process.env.NODE_ENV === 'development') return 'local'
  
  return 'direct'
}

// Initialize Prisma client with environment-specific configuration
const dbMode = getDbMode()
console.log(`Database mode: ${dbMode}, Edge runtime: ${isEdgeRuntime}`)

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalThis.prisma = prisma
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  connected: boolean
  mode: DbMode
  latency?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    if (!prisma) {
      return {
        connected: false,
        mode: dbMode,
        error: 'Prisma client not initialized'
      }
    }

    // Simple connectivity test
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - startTime

    return {
      connected: true,
      mode: dbMode,
      latency
    }
  } catch (error) {
    return {
      connected: false,
      mode: dbMode,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    if (prisma) {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
}

// Export database mode for debugging
export { dbMode }

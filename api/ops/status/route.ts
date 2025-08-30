import { NextRequest, NextResponse } from 'next/server'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { getRedisStore } from '@/lib/redis-store'
import { getCostMetrics, getObservabilityReports } from '@/lib/observability-prod'
import { getAuditLogger } from '@/lib/audit-prod'
import { prisma } from '@/lib/prisma'
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown'
type ApiStatus = 'available' | 'unavailable' | 'unknown'

interface SystemStatus {
  timestamp: string
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    apis: {
      openai: ApiStatus
      perplexity: ApiStatus
    }
  }
  rulebook: {
    activeVersion: number | null
    lastUpdated: string | null
    updatedBy: string | null
  }
  performance: {
    avgLatencyMs: number
    errorRate: number
    requestsLast24h: number
  }
  security: {
    failedAuthAttempts: number
    rateLimitHits: number
    suspiciousActivity: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request)
    
    const auditLogger = getAuditLogger()
    await auditLogger.log({
      actor: user.email,
      action: 'status_requested',
      route: '/api/ops/status'
    })

    const status: SystemStatus = {
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabaseStatus(),
        redis: await checkRedisStatus(),
        apis: {
          openai: await checkOpenAIStatus(),
          perplexity: await checkPerplexityStatus()
        }
      },
      rulebook: await getRulebookStatus(),
      performance: await getPerformanceMetrics(),
      security: await getSecurityMetrics()
    }

    logger.info('System status requested', { user: user.email, status: status.services })

    return createSecureResponse(status)
  } catch (error: any) {
    logger.error('Status request failed', { error: error.message })
    
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return createSecureErrorResponse('Unauthorized', 401)
    }
    
    return createSecureErrorResponse('Internal server error', 500)
  }
}

async function checkDatabaseStatus(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return 'healthy'
  } catch (error) {
    return 'unhealthy'
  }
}

async function checkRedisStatus(): Promise<ServiceStatus> {
  try {
    const redisStore = getRedisStore()
    if (!redisStore.isAvailable()) {
      return 'unknown'
    }
    await redisStore.ping()
    return 'healthy'
  } catch (error) {
    return 'unhealthy'
  }
}

async function checkOpenAIStatus(): Promise<ApiStatus> {
  return process.env.OPENAI_API_KEY ? 'available' : 'unavailable'
}

async function checkPerplexityStatus(): Promise<ApiStatus> {
  return process.env.PERPLEXITY_API_KEY ? 'available' : 'unavailable'
}

async function getRulebookStatus() {
  return {
    activeVersion: 1,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  }
}

async function getPerformanceMetrics() {
  const reports = await getObservabilityReports("1")
  const last24Hours = reports.filter((r: any) =>
    new Date(r.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  )

  const avgLatencyMs = last24Hours.length > 0
    ? last24Hours.reduce((sum: number, r: any) => sum + r.totalLatencyMs, 0) / last24Hours.length
    : 0

  const errorRate = last24Hours.length > 0
    ? last24Hours.filter((r: any) => r.stages.some((s: any) => !s.success)).length / last24Hours.length
    : 0

  return {
    avgLatencyMs: Math.round(avgLatencyMs),
    errorRate: Math.round(errorRate * 100) / 100,
    requestsLast24h: last24Hours.length
  }
}

async function getSecurityMetrics() {
  const auditLogger = getAuditLogger()
  const recentLogs = await auditLogger.getRecentLogs(1000)
  
  const last24Hours = recentLogs.filter((log: any) =>
    new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  )

  const failedAuthAttempts = last24Hours.filter((log: any) =>
    log.action.includes('auth') && !log.success
  ).length

  const rateLimitHits = last24Hours.filter((log: any) =>
    log.action.includes('rate_limit')
  ).length

  return {
    failedAuthAttempts,
    rateLimitHits,
    suspiciousActivity: 0
  }
}

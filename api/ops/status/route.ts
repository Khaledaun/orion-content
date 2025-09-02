
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
  metrics: {
    totalCost7Days: number
    totalTokens7Days: number
    totalRequests24Hours: number
    averageLatency24Hours: number | null
    errorRate24Hours: number
  }
  audits: {
    recentSecurityEvents: number
    failedAuthAttempts24Hours: number
    rateLimitHits24Hours: number
  }
  wordpress: {
    recentDrafts24Hours: number
    reviewNeededCount: number | null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 30 } // 30 requests per minute
    })

    const auditLogger = getAuditLogger()
    await auditLogger.log({
      route: '/api/ops/status',
      actor: user.email,
      action: 'ops_status_requested',
      metadata: {}
    })

    const status: SystemStatus = {
      timestamp: new Date().toISOString(),
      services: await getServicesStatus(),
      rulebook: await getRulebookStatus(),
      metrics: await getSystemMetrics(),
      audits: await getAuditMetrics(),
      wordpress: await getWordPressMetrics()
    }

    logger.info({ userId: user.id }, 'Ops status requested')
    return createSecureResponse(status)

  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    logger.error({ error }, 'Ops status error')
    return createSecureErrorResponse('Internal server error', 500)
  }
}

async function getServicesStatus() {
  const services = {
    database: 'unknown' as ServiceStatus,
    redis: 'unknown' as ServiceStatus,
    apis: {
      openai: 'unknown' as ApiStatus,
      perplexity: 'unknown' as ApiStatus
    }
  }

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`
    services.database = 'healthy'
  } catch {
    services.database = 'unhealthy'
  }

  // Check Redis
  const redisStore = getRedisStore()
  try {
    // Use a simple Redis command to check connection
    await redisStore.get('health_check')
    services.redis = 'healthy'
  } catch {
    services.redis = 'unhealthy'
  }

  // Check APIs (basic availability check)
  services.apis.openai = process.env.OPENAI_API_KEY ? 'available' : 'unavailable'
  services.apis.perplexity = process.env.PERPLEXITY_API_KEY ? 'available' : 'unavailable'

  return services
}

async function getRulebookStatus() {
  try {
    const activeRulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' }
    })

    return {
      activeVersion: activeRulebook?.version || null,
      lastUpdated: activeRulebook?.updatedAt?.toISOString() || null,
      updatedBy: activeRulebook?.updatedBy || null
    }
  } catch {
    return {
      activeVersion: null,
      lastUpdated: null,
      updatedBy: null
    }
  }
}

async function getSystemMetrics() {
  try {
    const costMetrics = await getCostMetrics(7)
    const reports = await getObservabilityReports()
    
    const last24Hours = reports.filter(r => 
      new Date(r.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )

    const averageLatency = last24Hours.length > 0
      ? last24Hours.reduce((sum, r) => sum + r.totalLatencyMs, 0) / last24Hours.length
      : null

    const errorRate = last24Hours.length > 0
      ? last24Hours.filter(r => r.stages.some(s => !s.success)).length / last24Hours.length
      : 0

    return {
      totalCost7Days: costMetrics.totalCost,
      totalTokens7Days: costMetrics.tokenUsage,
      totalRequests24Hours: last24Hours.length,
      averageLatency24Hours: averageLatency,
      errorRate24Hours: errorRate
    }
  } catch {
    return {
      totalCost7Days: 0,
      totalTokens7Days: 0,
      totalRequests24Hours: 0,
      averageLatency24Hours: null,
      errorRate24Hours: 0
    }
  }
}

async function getAuditMetrics() {
  try {
    const auditLogger = getAuditLogger()
    const securityEvents = await auditLogger.getSecurityEvents()
    const recentLogs = await auditLogger.getRecentLogs()
    
    const last24Hours = recentLogs.filter(log => 
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )

    const failedAuthAttempts = last24Hours.filter(log => 
      log.action === 'auth_failed'
    ).length

    const rateLimitHits = last24Hours.filter(log => 
      log.action === 'rate_limit_exceeded'
    ).length

    return {
      recentSecurityEvents: securityEvents.length,
      failedAuthAttempts24Hours: failedAuthAttempts,
      rateLimitHits24Hours: rateLimitHits
    }
  } catch {
    return {
      recentSecurityEvents: 0,
      failedAuthAttempts24Hours: 0,
      rateLimitHits24Hours: 0
    }
  }
}

async function getWordPressMetrics() {
  // This would integrate with WordPress API or track draft creation
  // For now, return placeholder values
  return {
    recentDrafts24Hours: 0,
    reviewNeededCount: null
  }
}
  
import { NextRequest, NextResponse } from 'next/server'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { getCostMetrics, getObservabilityReports } from '@/lib/observability-prod'
import { getAuditLogger } from '@/lib/audit-prod'
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface MetricsQuery {
  days?: number
  includeDetails?: boolean
  siteId?: string
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request)
    
    const { searchParams } = new URL(request.url)
    const query: MetricsQuery = {
      days: parseInt(searchParams.get('days') || '7'),
      includeDetails: searchParams.get('includeDetails') === 'true',
      siteId: searchParams.get('siteId') || undefined
    }

    const auditLogger = getAuditLogger()
    await auditLogger.log({
      actor: user.email,
      action: 'metrics_requested',
      route: '/api/ops/metrics',
      metadata: { query }
    })

    const costMetrics = await getCostMetrics(query.days || 7)
    const observabilityReports = await getObservabilityReports(String(query.days || 7))

    const metrics = {
      timestamp: new Date().toISOString(),
      period: `${query.days} days`,
      costs: costMetrics,
      observability: observabilityReports,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    }

    logger.info('Metrics requested', { user: user.email, query })

    return createSecureResponse(metrics)
  } catch (error: any) {
    logger.error('Metrics request failed', { error: error.message })
    
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return createSecureErrorResponse('Unauthorized', 401)
    }
    
    return createSecureErrorResponse('Internal server error', 500)
  }
}

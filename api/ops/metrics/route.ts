
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
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 60 } // 60 requests per minute
    })

    const { searchParams } = new URL(request.url)
    const query: MetricsQuery = {
      days: parseInt(searchParams.get('days') || '7'),
      includeDetails: searchParams.get('includeDetails') === 'true'
    }

    const auditLogger = getAuditLogger()
    await auditLogger.log({
      route: '/api/ops/metrics',
      actor: user.email,
      action: 'metrics_requested',
      metadata: { query }
    })

    const costMetrics = await getCostMetrics(query.days || 7)
    const observabilityReports = query.includeDetails 
      ? await getObservabilityReports()
      : []

    const metrics = {
      period: {
        days: query.days || 7,
        startDate: new Date(Date.now() - (query.days || 7) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      costs: costMetrics,
      ...(query.includeDetails && {
        observability: observabilityReports.slice(0, 100) // Limit to recent 100
      })
    }

    logger.info({ userId: user.id, query }, 'Metrics requested')
    return createSecureResponse(metrics)

  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    logger.error({ error }, 'Metrics error')
    return createSecureErrorResponse('Internal server error', 500)
  }
}

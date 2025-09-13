
/**
 * Enhanced Health Check API Endpoint
 * Phase 1 Enhancement: Comprehensive health status API
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/health-monitor'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const detailed = searchParams.get('detailed') === 'true'
    const format = searchParams.get('format') || 'json'
    const checks = searchParams.get('checks')?.split(',')

    // Run health checks
    const systemHealth = await healthMonitor.runAllHealthChecks()
    
    // Filter checks if specified
    if (checks) {
      const filteredChecks: Record<string, any> = {}
      for (const checkName of checks) {
        if (systemHealth.checks[checkName]) {
          filteredChecks[checkName] = systemHealth.checks[checkName]
        }
      }
      systemHealth.checks = filteredChecks
    }

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Prepare response data
    const responseData = {
      status: systemHealth.overall,
      timestamp: new Date().toISOString(),
      uptime: systemHealth.uptime,
      version: systemHealth.version,
      environment: systemHealth.environment,
      responseTime,
      ...(detailed && {
        checks: systemHealth.checks,
        alerts: healthMonitor.getHealthAlerts()
      }),
      ...(!detailed && {
        summary: {
          total: Object.keys(systemHealth.checks).length,
          healthy: Object.values(systemHealth.checks).filter(c => c.status === 'healthy').length,
          degraded: Object.values(systemHealth.checks).filter(c => c.status === 'degraded').length,
          unhealthy: Object.values(systemHealth.checks).filter(c => c.status === 'unhealthy').length
        }
      })
    }

    // Determine HTTP status code
    let statusCode: number
    switch (systemHealth.overall) {
      case 'healthy':
        statusCode = 200
        break
      case 'degraded':
        statusCode = 200 // Still operational
        break
      case 'critical':
        statusCode = 503 // Service unavailable
        break
      default:
        statusCode = 500
    }

    // Handle different response formats
    if (format === 'plain') {
      const plainText = `Status: ${systemHealth.overall.toUpperCase()}\n` +
        `Uptime: ${Math.floor(systemHealth.uptime / 1000)}s\n` +
        `Response Time: ${responseTime}ms\n` +
        `Environment: ${systemHealth.environment}\n`

      return new NextResponse(plainText, {
        status: statusCode,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    // JSON response (default)
    return NextResponse.json(responseData, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': systemHealth.overall,
        'X-Response-Time': responseTime.toString()
      }
    })

  } catch (error) {
    logger.error('Health check API error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': 'unhealthy'
        }
      }
    )
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const systemHealth = await healthMonitor.runAllHealthChecks()
    
    let statusCode: number
    switch (systemHealth.overall) {
      case 'healthy':
        statusCode = 200
        break
      case 'degraded':
        statusCode = 200
        break
      case 'critical':
        statusCode = 503
        break
      default:
        statusCode = 500
    }

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-Health-Status': systemHealth.overall,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-Health-Status': 'unhealthy',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}

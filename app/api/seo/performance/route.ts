/**
 * SEO Performance Monitoring API
 * Handles performance monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEditAccess } from '@/app/lib/rbac';
import { SEOPerformanceMonitor } from '@/lib/seo/performance-monitor';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();
    
    const { 
      siteId, 
      action,
      data = {}
    } = body;

    if (!siteId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: siteId, action' },
        { status: 400 }
      );
    }

    const performanceMonitor = new SEOPerformanceMonitor();

    switch (action) {
      case 'setup_monitoring': {
        const { domain, monitoringFrequency, alertThresholds, enabledAlerts, notificationChannels, webhookUrl } = data;
        
        if (!domain) {
          return NextResponse.json(
            { error: 'Missing domain for monitoring setup' },
            { status: 400 }
          );
        }

        const config = await performanceMonitor.setupMonitoring({
          siteId,
          domain,
          monitoringFrequency: monitoringFrequency || 'daily',
          alertThresholds: alertThresholds || {
            trafficDrop: 15,
            rankingDrop: 3,
            backlinkLoss: 5,
            pageSpeedDrop: 1,
          },
          enabledAlerts: enabledAlerts || ['traffic_decrease', 'ranking_drop', 'backlink_loss', 'technical_issue'],
          notificationChannels: notificationChannels || {
            email: true,
            slack: false,
            webhook: false,
          },
          webhookUrl,
        });

        // Save monitoring configuration to database
        await prisma.performanceMonitoring.upsert({
          where: { siteId },
          update: {
            domain: config.domain,
            monitoringFrequency: config.monitoringFrequency,
            alertThresholds: config.alertThresholds,
            enabledAlerts: config.enabledAlerts,
            notificationChannels: config.notificationChannels,
            webhookUrl: config.webhookUrl,
            updatedAt: new Date(),
          },
          create: {
            siteId,
            domain: config.domain,
            monitoringFrequency: config.monitoringFrequency,
            alertThresholds: config.alertThresholds,
            enabledAlerts: config.enabledAlerts,
            notificationChannels: config.notificationChannels,
            webhookUrl: config.webhookUrl,
          },
        });

        logger.info(
          { userId, siteId, domain: redactSensitive(domain) },
          'Performance monitoring setup completed'
        );

        return NextResponse.json({
          success: true,
          config,
          message: 'Performance monitoring setup completed',
        });
      }

      case 'run_monitoring': {
        logger.info(
          { userId, siteId },
          'Running performance monitoring'
        );

        const dashboard = await performanceMonitor.runMonitoring(siteId);

        return NextResponse.json({
          success: true,
          dashboard,
          message: 'Performance monitoring completed',
        });
      }

      case 'resolve_alert': {
        const { alertId, resolution } = data;
        
        if (!alertId || !resolution) {
          return NextResponse.json(
            { error: 'Missing alertId or resolution' },
            { status: 400 }
          );
        }

        await performanceMonitor.resolveAlert(alertId, resolution);

        // Update alert in database
        await prisma.performanceAlert.update({
          where: { id: alertId },
          data: {
            resolved: true,
            resolvedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Alert resolved',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      'Performance monitoring API failed'
    );

    return NextResponse.json(
      { 
        error: 'Performance monitoring operation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);
    
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId || !action) {
      return NextResponse.json(
        { error: 'Missing siteId or action parameter' },
        { status: 400 }
      );
    }

    const performanceMonitor = new SEOPerformanceMonitor();

    switch (action) {
      case 'dashboard': {
        const dashboard = await performanceMonitor.getDashboard(siteId);

        if (!dashboard) {
          return NextResponse.json(
            { error: 'Performance monitoring not set up for this site' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          dashboard,
        });
      }

      case 'alerts': {
        const days = parseInt(searchParams.get('days') || '30');
        const alerts = await performanceMonitor.getAlertHistory(siteId, days);

        return NextResponse.json({
          success: true,
          alerts,
        });
      }

      case 'config': {
        const config = await prisma.performanceMonitoring.findUnique({
          where: { siteId },
        });

        return NextResponse.json({
          success: true,
          config,
        });
      }

      case 'metrics': {
        const monitoring = await prisma.performanceMonitoring.findUnique({
          where: { siteId },
          include: {
            metrics: {
              orderBy: { timestamp: 'desc' },
              take: 100,
            },
          },
        });

        if (!monitoring) {
          return NextResponse.json(
            { error: 'Performance monitoring not set up for this site' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          metrics: monitoring.metrics,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      'Performance monitoring GET API failed'
    );

    return NextResponse.json(
      { error: 'Performance monitoring operation failed' },
      { status: 500 }
    );
  }
}

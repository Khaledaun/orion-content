/**
 * Competitor Monitoring API
 * Handles competitor analysis and monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEditAccess } from "@/app/lib/rbac";
import { CompetitorMonitor } from "@/lib/seo/competitor-monitor";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();

    const { siteId, action, data = {} } = body;

    if (!siteId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, action" },
        { status: 400 },
      );
    }

    const competitorMonitor = new CompetitorMonitor();

    switch (action) {
      case "setup_monitoring": {
        const {
          domain,
          competitors,
          monitoringFrequency,
          alertThresholds,
          enabledAlerts,
          notificationChannels,
          webhookUrl,
        } = data;

        if (!domain || !competitors || competitors.length === 0) {
          return NextResponse.json(
            { error: "Missing domain or competitors for monitoring setup" },
            { status: 400 },
          );
        }

        const config = await competitorMonitor.setupCompetitorMonitoring({
          domain,
          competitors,
          monitoringFrequency: monitoringFrequency || "weekly",
          alertThresholds: alertThresholds || {
            positionChange: 5,
            trafficChange: 10,
            newBacklinks: 10,
            newKeywords: 20,
          },
          enabledAlerts: enabledAlerts || [
            "new_keyword",
            "position_change",
            "new_backlink",
          ],
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
          {
            userId,
            siteId,
            domain: redactSensitive(domain),
            competitorsCount: competitors.length,
          },
          "Competitor monitoring setup completed",
        );

        return NextResponse.json({
          success: true,
          config,
          message: "Competitor monitoring setup completed",
        });
      }

      case "analyze_competitors": {
        const { domain, competitors } = data;

        if (!domain || !competitors || competitors.length === 0) {
          return NextResponse.json(
            { error: "Missing domain or competitors for analysis" },
            { status: 400 },
          );
        }

        const profiles = await competitorMonitor.analyzeCompetitors(
          domain,
          competitors,
        );

        // Save competitor profiles to database
        for (const profile of profiles) {
          await prisma.competitorProfile.upsert({
            where: {
              domain_siteId: {
                domain: profile.domain,
                siteId,
              },
            },
            update: {
              name: profile.name,
              industry: profile.industry,
              lastAnalyzed: profile.lastAnalyzed,
              metrics: profile.metrics,
              topKeywords: profile.topKeywords,
              topPages: profile.topPages,
              backlinkProfile: profile.backlinkProfile,
              contentStrategy: profile.contentStrategy,
            },
            create: {
              domain: profile.domain,
              name: profile.name,
              industry: profile.industry,
              siteId,
              lastAnalyzed: profile.lastAnalyzed,
              metrics: profile.metrics,
              topKeywords: profile.topKeywords,
              topPages: profile.topPages,
              backlinkProfile: profile.backlinkProfile,
              contentStrategy: profile.contentStrategy,
            },
          });
        }

        return NextResponse.json({
          success: true,
          profiles,
          message: "Competitor analysis completed",
        });
      }

      case "compare_competitors": {
        const { domain, competitors } = data;

        if (!domain || !competitors || competitors.length === 0) {
          return NextResponse.json(
            { error: "Missing domain or competitors for comparison" },
            { status: 400 },
          );
        }

        const comparison = await competitorMonitor.compareWithCompetitors(
          domain,
          competitors,
        );

        return NextResponse.json({
          success: true,
          comparison,
          message: "Competitor comparison completed",
        });
      }

      case "mark_alert_read": {
        const { alertId } = data;

        if (!alertId) {
          return NextResponse.json(
            { error: "Missing alertId" },
            { status: 400 },
          );
        }

        await competitorMonitor.markAlertAsRead(alertId);

        // Update alert in database
        await prisma.competitorAlert.update({
          where: { id: alertId },
          data: { read: true },
        });

        return NextResponse.json({
          success: true,
          message: "Alert marked as read",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      "Competitor monitoring API failed",
    );

    return NextResponse.json(
      {
        error: "Competitor monitoring operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);

    const siteId = searchParams.get("siteId");
    const action = searchParams.get("action");

    if (!siteId || !action) {
      return NextResponse.json(
        { error: "Missing siteId or action parameter" },
        { status: 400 },
      );
    }

    const competitorMonitor = new CompetitorMonitor();

    switch (action) {
      case "profiles": {
        const profiles = await prisma.competitorProfile.findMany({
          where: { siteId },
          orderBy: { lastAnalyzed: "desc" },
        });

        return NextResponse.json({
          success: true,
          profiles,
        });
      }

      case "alerts": {
        const limit = parseInt(searchParams.get("limit") || "50");
        const alerts = await competitorMonitor.getCompetitorAlerts(
          siteId,
          limit,
        );

        return NextResponse.json({
          success: true,
          alerts,
        });
      }

      case "trends": {
        const competitor = searchParams.get("competitor");
        const days = parseInt(searchParams.get("days") || "30");

        if (!competitor) {
          return NextResponse.json(
            { error: "Missing competitor parameter" },
            { status: 400 },
          );
        }

        const trends = await competitorMonitor.getCompetitorTrends(
          siteId,
          competitor,
          days,
        );

        return NextResponse.json({
          success: true,
          trends,
        });
      }

      case "monitoring_config": {
        const config = await prisma.performanceMonitoring.findUnique({
          where: { siteId },
        });

        return NextResponse.json({
          success: true,
          config,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      "Competitor monitoring GET API failed",
    );

    return NextResponse.json(
      { error: "Competitor monitoring operation failed" },
      { status: 500 },
    );
  }
}

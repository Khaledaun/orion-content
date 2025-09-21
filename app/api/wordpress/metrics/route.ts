/**
 * WordPress Metrics API Endpoint
 * Provides WordPress publishing metrics and analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { WordPressTelemetry } from "@/lib/wordpress/telemetry";
import { requireEditAccess } from "@/app/lib/rbac";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

const telemetry = new WordPressTelemetry();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const days = parseInt(searchParams.get("days") || "30");
    const type = searchParams.get("type") || "global"; // 'global', 'site', 'trends'

    if (type === "site" && !siteId) {
      return NextResponse.json(
        { error: "Site ID is required for site metrics" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "global":
        result = await telemetry.getGlobalMetrics(days);
        break;
      case "site":
        result = await telemetry.getSiteMetrics(siteId!, days);
        break;
      case "trends":
        result = await telemetry.getPublishingTrends(days);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid type. Supported types: global, site, trends" },
          { status: 400 }
        );
    }

    logger.info(
      {
        userId,
        siteId,
        type,
        days,
      },
      "WordPress metrics retrieved successfully"
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "get_wordpress_metrics",
      },
      "Failed to get WordPress metrics"
    );

    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

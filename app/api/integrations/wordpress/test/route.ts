/**
 * WordPress Connection Test API Endpoint
 * Tests WordPress connection and returns site information
 */

import { NextRequest, NextResponse } from "next/server";
import { WordPressIntegrationManager } from "@/lib/wordpress/integration-manager";
import { requireEditAccess } from "@/app/lib/rbac";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

const wpManager = new WordPressIntegrationManager();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();
    
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const testResult = await wpManager.testWordPressConnectionBySite(siteId);

    logger.info(
      {
        userId,
        siteId,
        success: testResult.success,
        message: redactSensitive(testResult.message),
      },
      "WordPress connection test completed"
    );

    return NextResponse.json(testResult);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "test_wordpress_connection",
      },
      "Failed to test WordPress connection"
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

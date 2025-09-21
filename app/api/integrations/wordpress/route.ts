/**
 * WordPress Integration API Endpoints
 * Handles WordPress connection management and testing
 */

import { NextRequest, NextResponse } from "next/server";
import { WordPressIntegrationManager } from "@/lib/wordpress/integration-manager";
import { requireEditAccess } from "@/app/lib/rbac";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

const wpManager = new WordPressIntegrationManager();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const integration = await wpManager.getWordPressIntegration(siteId);
    
    if (!integration) {
      return NextResponse.json(
        { error: "No WordPress integration found for this site" },
        { status: 404 }
      );
    }

    return NextResponse.json(integration);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "get_wordpress_integration",
      },
      "Failed to get WordPress integration"
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();
    
    const { siteId, siteUrl, username, appPassword } = body;

    if (!siteId || !siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, siteUrl, username, appPassword" },
        { status: 400 }
      );
    }

    // Validate site URL format
    try {
      new URL(siteUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid site URL format" },
        { status: 400 }
      );
    }

    const integration = await wpManager.saveWordPressCredentials(siteId, {
      siteUrl,
      username,
      appPassword,
    });

    logger.info(
      {
        userId,
        siteId,
        siteUrl: redactSensitive(siteUrl),
        integrationId: integration.id,
      },
      "WordPress credentials saved successfully"
    );

    return NextResponse.json(integration);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "save_wordpress_credentials",
      },
      "Failed to save WordPress credentials"
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

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const success = await wpManager.deleteWordPressCredentials(siteId);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete WordPress credentials" },
        { status: 500 }
      );
    }

    logger.info(
      {
        userId,
        siteId,
      },
      "WordPress credentials deleted successfully"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "delete_wordpress_credentials",
      },
      "Failed to delete WordPress credentials"
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

/**
 * WordPress Publishing API Endpoints
 * Handles WordPress post creation, updates, and publishing
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
    
    const { 
      siteId, 
      action, 
      postId, 
      draft 
    } = body;

    if (!siteId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, action" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "stream_draft":
        if (!draft) {
          return NextResponse.json(
            { error: "Draft data is required for stream_draft action" },
            { status: 400 }
          );
        }
        
        result = await wpManager.streamDraftToWordPress(siteId, draft);
        break;

      case "publish":
        if (!postId) {
          return NextResponse.json(
            { error: "Post ID is required for publish action" },
            { status: 400 }
          );
        }
        
        result = await wpManager.publishWordPressPost(siteId, postId);
        break;

      case "update":
        if (!postId || !draft) {
          return NextResponse.json(
            { error: "Post ID and draft data are required for update action" },
            { status: 400 }
          );
        }
        
        result = await wpManager.updateWordPressPost(siteId, postId, draft);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: stream_draft, publish, update" },
          { status: 400 }
        );
    }

    logger.info(
      {
        userId,
        siteId,
        action,
        postId,
        success: result.success,
      },
      `WordPress ${action} action completed`
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "wordpress_publish",
      },
      "Failed to process WordPress publishing action"
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

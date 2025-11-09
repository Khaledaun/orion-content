/**
 * WordPress Publishing Workflow API Endpoint
 * Handles the complete WordPress publishing workflow with rulebook integration
 */

import { NextRequest, NextResponse } from "next/server";
import { WordPressPublishingWorkflow } from "@/lib/wordpress/publishing-workflow";
import { requireEditAccess } from "@/app/lib/rbac";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

const workflow = new WordPressPublishingWorkflow();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();
    
    const { 
      siteId, 
      draftId, 
      action,
      publishImmediately = false,
      skipRulebookCheck = false 
    } = body;

    if (!siteId || !draftId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, draftId, action" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "stream_and_publish":
        result = await workflow.executeWorkflow({
          siteId,
          draftId,
          userId,
          publishImmediately: true,
          skipRulebookCheck,
        });
        break;

      case "stream_draft":
        result = await workflow.executeWorkflow({
          siteId,
          draftId,
          userId,
          publishImmediately: false,
          skipRulebookCheck,
        });
        break;

      case "publish":
        result = await workflow.publishWordPressPost(siteId, draftId, userId);
        break;

      case "get_status":
        result = await workflow.getWordPressPostStatus(siteId, draftId);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: stream_and_publish, stream_draft, publish, get_status" },
          { status: 400 }
        );
    }

    logger.info(
      {
        userId,
        siteId,
        draftId,
        action,
        success: (result as any).success,
      },
      `WordPress workflow ${action} completed`
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "wordpress_workflow",
      },
      "Failed to process WordPress workflow"
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

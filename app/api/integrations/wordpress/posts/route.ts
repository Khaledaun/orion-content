/**
 * WordPress Posts API Endpoints
 * Handles WordPress post listing and retrieval
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
    const postId = searchParams.get("postId");
    const per_page = searchParams.get("per_page");
    const page = searchParams.get("page");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Get specific post by ID
    if (postId) {
      const post = await wpManager.getWordPressPost(siteId, parseInt(postId));
      
      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(post);
    }

    // List posts with optional filtering
    const options = {
      per_page: per_page ? parseInt(per_page) : undefined,
      page: page ? parseInt(page) : undefined,
      status: status || undefined,
      search: search || undefined,
    };

    const posts = await wpManager.listWordPressPosts(siteId, options);

    logger.info(
      {
        userId,
        siteId,
        postCount: posts.length,
        options,
      },
      "WordPress posts retrieved successfully"
    );

    return NextResponse.json(posts);
  } catch (error) {
    logger.error(
      {
        error: redactSensitive(error),
        action: "get_wordpress_posts",
      },
      "Failed to get WordPress posts"
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

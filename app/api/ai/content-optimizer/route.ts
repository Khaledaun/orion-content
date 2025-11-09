/**
 * AI Content Optimization API
 * Handles content analysis and optimization
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEditAccess } from "@/app/lib/rbac";
import { ContentOptimizer } from "@/lib/ai/content-optimizer";
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

    const contentOptimizer = new ContentOptimizer();

    switch (action) {
      case "analyze_content": {
        const { content, url, title, metaDescription, keywords } = data;

        if (!content || !url || !title) {
          return NextResponse.json(
            { error: "Missing required fields: content, url, title" },
            { status: 400 },
          );
        }

        logger.info(
          { userId, siteId, url: redactSensitive(url) },
          "Starting content analysis",
        );

        const analysis = await contentOptimizer.analyzeContent(
          content,
          url,
          title,
          metaDescription || "",
          keywords || [],
        );

        // Save analysis to database
        await prisma.contentOptimization.create({
          data: {
            siteId,
            url,
            title,
            metaDescription: metaDescription || "",
            keywords: keywords || [],
            analysis: analysis,
            status: "analyzed",
          },
        });

        return NextResponse.json({
          success: true,
          analysis,
          message: "Content analysis completed",
        });
      }

      case "optimize_content": {
        const {
          content,
          url,
          title,
          metaDescription,
          keywords,
          targetKeywords,
        } = data;

        if (!content || !url || !title) {
          return NextResponse.json(
            { error: "Missing required fields: content, url, title" },
            { status: 400 },
          );
        }

        // First analyze the content
        const analysis = await contentOptimizer.analyzeContent(
          content,
          url,
          title,
          metaDescription || "",
          keywords || [],
        );

        // Then optimize it
        const optimization = await contentOptimizer.optimizeContent(
          content,
          analysis,
          targetKeywords || keywords || [],
        );

        // Save optimization to database
        await prisma.contentOptimization.upsert({
          where: {
            siteId_url: {
              siteId,
              url,
            },
          },
          update: {
            analysis: analysis,
            optimizations: optimization,
            improvements: optimization.improvements,
            suggestions: optimization.suggestions,
            status: "optimized",
            updatedAt: new Date(),
          },
          create: {
            siteId,
            url,
            title,
            metaDescription: metaDescription || "",
            keywords: keywords || [],
            analysis: analysis,
            optimizations: optimization,
            improvements: optimization.improvements,
            suggestions: optimization.suggestions,
            status: "optimized",
          },
        });

        logger.info(
          {
            userId,
            siteId,
            url: redactSensitive(url),
            overallImprovement: optimization.improvements.overallImprovement,
          },
          "Content optimization completed",
        );

        return NextResponse.json({
          success: true,
          optimization,
          message: "Content optimization completed",
        });
      }

      case "generate_template": {
        const { contentType, targetKeywords, contentLength } = data;

        if (!contentType || !targetKeywords || !contentLength) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: contentType, targetKeywords, contentLength",
            },
            { status: 400 },
          );
        }

        const template = await contentOptimizer.generateContentTemplate(
          contentType,
          targetKeywords,
          contentLength,
        );

        // Save template to database
        await prisma.contentTemplate.create({
          data: {
            name: template.name,
            type: template.type,
            structure: template.structure,
            seoRequirements: template.seoRequirements,
            readabilityTargets: template.readabilityTargets,
            siteId,
            isGlobal: false,
          },
        });

        return NextResponse.json({
          success: true,
          template,
          message: "Content template generated",
        });
      }

      case "save_template": {
        const {
          name,
          type,
          structure,
          seoRequirements,
          readabilityTargets,
          isGlobal,
        } = data;

        if (!name || !type || !structure) {
          return NextResponse.json(
            { error: "Missing required fields: name, type, structure" },
            { status: 400 },
          );
        }

        const template = await prisma.contentTemplate.create({
          data: {
            name,
            type,
            structure,
            seoRequirements: seoRequirements || {},
            readabilityTargets: readabilityTargets || {},
            siteId: isGlobal ? null : siteId,
            isGlobal: isGlobal || false,
          },
        });

        return NextResponse.json({
          success: true,
          template,
          message: "Content template saved",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      "Content optimization API failed",
    );

    return NextResponse.json(
      {
        error: "Content optimization operation failed",
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

    switch (action) {
      case "optimizations": {
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status");

        const where: any = { siteId };
        if (status) {
          where.status = status;
        }

        const optimizations = await prisma.contentOptimization.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return NextResponse.json({
          success: true,
          optimizations,
        });
      }

      case "optimization": {
        const url = searchParams.get("url");

        if (!url) {
          return NextResponse.json(
            { error: "Missing url parameter" },
            { status: 400 },
          );
        }

        const optimization = await prisma.contentOptimization.findFirst({
          where: {
            siteId,
            url,
          },
          orderBy: { createdAt: "desc" },
        });

        if (!optimization) {
          return NextResponse.json(
            { error: "Content optimization not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          optimization,
        });
      }

      case "templates": {
        const type = searchParams.get("type");
        const isGlobal = searchParams.get("isGlobal") === "true";

        const where: any = {};
        if (isGlobal) {
          where.isGlobal = true;
        } else {
          where.siteId = siteId;
        }
        if (type) {
          where.type = type;
        }

        const templates = await prisma.contentTemplate.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
          success: true,
          templates,
        });
      }

      case "template": {
        const templateId = searchParams.get("templateId");

        if (!templateId) {
          return NextResponse.json(
            { error: "Missing templateId parameter" },
            { status: 400 },
          );
        }

        const template = await prisma.contentTemplate.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          return NextResponse.json(
            { error: "Content template not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          template,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      "Content optimization GET API failed",
    );

    return NextResponse.json(
      { error: "Content optimization operation failed" },
      { status: 500 },
    );
  }
}

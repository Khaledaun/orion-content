/**
 * SEO Audit API Endpoint
 * Handles comprehensive SEO audits for WordPress sites
 */

import { NextRequest, NextResponse } from "next/server";
import { SEOAuditEngine, SEOAuditOptions } from "@/lib/seo/audit-engine";
import { requireEditAccess } from "@/app/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();

    const { siteId, siteUrl, options = {} } = body;

    if (!siteId || !siteUrl) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, siteUrl" },
        { status: 400 },
      );
    }

    // Validate site ownership
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    logger.info(
      {
        userId,
        siteId,
        siteUrl: redactSensitive(siteUrl),
      },
      "Starting SEO audit",
    );

    // Create audit record
    const auditRecord = await prisma.seoSiteAudit.create({
      data: {
        siteId,
        siteUrl,
        status: "running",
        overallScore: 0,
        technicalScore: 0,
        contentScore: 0,
        performanceScore: 0,
        accessibilityScore: 0,
        wordpressScore: 0,
        issues: [],
        recommendations: [],
        wordpressInfo: {},
        summary: {},
      },
    });

    // Perform SEO audit
    const auditEngine = new SEOAuditEngine();
    const auditOptions: SEOAuditOptions = {
      maxPages: options.maxPages || 50,
      maxDepth: options.maxDepth || 3,
      timeout: options.timeout || 30000,
      includePerformance: options.includePerformance !== false,
      includeAccessibility: options.includeAccessibility !== false,
      includeWordPress: options.includeWordPress !== false,
    };

    const auditResult = await auditEngine.performAudit(
      siteUrl,
      auditOptions,
      (progress) => {
        // Update progress in database
        prisma.seoSiteAudit
          .update({
            where: { id: auditRecord.id },
            data: {
              summary: {
                ...auditRecord.summary,
                progress: progress.progress,
                stage: progress.stage,
                message: progress.message,
              },
            },
          })
          .catch((error: any) => {
            logger.warn(
              { error: redactSensitive(error) },
              "Failed to update audit progress",
            );
          });
      },
    );

    // Save audit results
    const updatedAudit = await prisma.seoSiteAudit.update({
      where: { id: auditRecord.id },
      data: {
        status: "completed",
        overallScore: auditResult.score.overall,
        technicalScore: auditResult.score.technical,
        contentScore: auditResult.score.content,
        performanceScore: auditResult.score.performance,
        accessibilityScore: auditResult.score.accessibility,
        wordpressScore: auditResult.score.wordpress,
        issues: auditResult.issues,
        recommendations: auditResult.recommendations,
        wordpressInfo: auditResult.wordpressInfo,
        summary: auditResult.summary,
        auditDate: auditResult.auditDate,
      },
    });

    // Save individual issues
    for (const issue of auditResult.issues) {
      await prisma.seoIssue.create({
        data: {
          auditId: auditRecord.id,
          type: issue.type,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          impact: issue.impact,
          fix: issue.fix,
          affectedPages: issue.affectedPages,
          score: issue.score,
          status: "open",
        },
      });
    }

    logger.info(
      {
        userId,
        siteId,
        auditId: auditRecord.id,
        overallScore: auditResult.score.overall,
        totalIssues: auditResult.issues.length,
      },
      "SEO audit completed successfully",
    );

    return NextResponse.json({
      success: true,
      auditId: auditRecord.id,
      score: auditResult.score,
      totalIssues: auditResult.issues.length,
      recommendations: auditResult.recommendations,
      message: "SEO audit completed successfully",
    });
  } catch (error) {
    logger.error({ error: redactSensitive(error) }, "SEO audit failed");

    return NextResponse.json(
      {
        error: "SEO audit failed",
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
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!siteId) {
      return NextResponse.json(
        { error: "Missing siteId parameter" },
        { status: 400 },
      );
    }

    // Get audit history for the site
    const audits = await prisma.seoSiteAudit.findMany({
      where: { siteId },
      orderBy: { auditDate: "desc" },
      take: limit,
      skip: offset,
      include: {
        issues_detail: {
          where: { status: "open" },
          orderBy: { impact: "desc" },
        },
      },
    });

    const totalAudits = await prisma.seoSiteAudit.count({
      where: { siteId },
    });

    return NextResponse.json({
      audits,
      totalAudits,
      hasMore: offset + limit < totalAudits,
    });
  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      "Failed to retrieve SEO audits",
    );

    return NextResponse.json(
      { error: "Failed to retrieve SEO audits" },
      { status: 500 },
    );
  }
}

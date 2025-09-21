/**
 * Individual SEO Audit API Endpoint
 * Handles specific audit details and issue management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEditAccess } from '@/app/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export async function GET(
  request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  try {
    const { userId } = await requireEditAccess(request);
    const { auditId } = params;

    // Get audit details
    const audit = await prisma.seoSiteAudit.findUnique({
      where: { id: auditId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
        issues_detail: {
          orderBy: [
            { impact: 'desc' },
            { type: 'desc' },
            { score: 'asc' },
          ],
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // Group issues by category and type
    const issuesByCategory = audit.issues_detail.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = { error: [], warning: [], info: [] };
      }
      acc[issue.category][issue.type as keyof typeof acc[typeof issue.category]].push(issue);
      return acc;
    }, {} as Record<string, { error: any[]; warning: any[]; info: any[] }>);

    // Calculate issue statistics
    const issueStats = {
      total: audit.issues_detail.length,
      critical: audit.issues_detail.filter(i => i.impact === 'high').length,
      warnings: audit.issues_detail.filter(i => i.impact === 'medium').length,
      info: audit.issues_detail.filter(i => i.impact === 'low').length,
      byCategory: Object.keys(issuesByCategory).reduce((acc, category) => {
        acc[category] = {
          total: issuesByCategory[category].error.length + 
                 issuesByCategory[category].warning.length + 
                 issuesByCategory[category].info.length,
          critical: issuesByCategory[category].error.length,
          warnings: issuesByCategory[category].warning.length,
          info: issuesByCategory[category].info.length,
        };
        return acc;
      }, {} as Record<string, { total: number; critical: number; warnings: number; info: number }>),
    };

    return NextResponse.json({
      audit,
      issuesByCategory,
      issueStats,
    });

  } catch (error) {
    logger.error(
      { error: redactSensitive(error), auditId: params.auditId },
      'Failed to retrieve audit details'
    );

    return NextResponse.json(
      { error: 'Failed to retrieve audit details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  try {
    const { userId } = await requireEditAccess(request);
    const { auditId } = params;
    const body = await request.json();

    const { action, issueIds, status } = body;

    if (action === 'update_issue_status' && issueIds && status) {
      // Update issue status
      const updatedIssues = await prisma.seoIssue.updateMany({
        where: {
          id: { in: issueIds },
          auditId,
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      logger.info(
        { userId, auditId, issueIds, status },
        'Updated issue statuses'
      );

      return NextResponse.json({
        success: true,
        updatedCount: updatedIssues.count,
        message: `Updated ${updatedIssues.count} issues to ${status}`,
      });
    }

    if (action === 'regenerate_audit') {
      // Mark audit for regeneration
      const audit = await prisma.seoSiteAudit.findUnique({
        where: { id: auditId },
      });

      if (!audit) {
        return NextResponse.json(
          { error: 'Audit not found' },
          { status: 404 }
        );
      }

      // Create new audit record
      const newAudit = await prisma.seoSiteAudit.create({
        data: {
          siteId: audit.siteId,
          siteUrl: audit.siteUrl,
          status: 'pending',
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

      logger.info(
        { userId, auditId, newAuditId: newAudit.id },
        'Created new audit for regeneration'
      );

      return NextResponse.json({
        success: true,
        newAuditId: newAudit.id,
        message: 'New audit created for regeneration',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error(
      { error: redactSensitive(error), auditId: params.auditId },
      'Failed to update audit'
    );

    return NextResponse.json(
      { error: 'Failed to update audit' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  try {
    const { userId } = await requireEditAccess(request);
    const { auditId } = params;

    // Delete audit and all related issues
    await prisma.seoSiteAudit.delete({
      where: { id: auditId },
    });

    logger.info(
      { userId, auditId },
      'Deleted SEO audit'
    );

    return NextResponse.json({
      success: true,
      message: 'Audit deleted successfully',
    });

  } catch (error) {
    logger.error(
      { error: redactSensitive(error), auditId: params.auditId },
      'Failed to delete audit'
    );

    return NextResponse.json(
      { error: 'Failed to delete audit' },
      { status: 500 }
    );
  }
}

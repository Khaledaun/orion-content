
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { seoAuditEngine } from '@/lib/seo-audit-engine';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.SEO_AUDIT)(
  async (req: NextRequest, user) => {
    try {
      const { 
        siteId, 
        type = 'full-site',
        targetUrl,
        includeCompetitor = false,
        competitorUrls = [],
        includeTechnical = true,
        includeContent = true,
        includePerformance = true,
        includeAccessibility = true
      } = await req.json();

      if (!siteId) {
        return NextResponse.json(
          { error: 'Site ID is required' },
          { status: 400 }
        );
      }

      // Check if user has access to this site
      const hasAccess = await enhancedRBAC.canAccessSite(user.id, siteId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this site' },
          { status: 403 }
        );
      }

      // Create and run SEO audit
      const audit = await seoAuditEngine.createAudit(siteId, {
        type,
        targetUrl,
        includeCompetitor,
        competitorUrls,
        includeTechnical,
        includeContent,
        includePerformance,
        includeAccessibility
      });

      return NextResponse.json({
        success: true,
        audit: {
          id: audit.id,
          status: audit.status,
          type: audit.type,
          targetUrl: audit.targetUrl,
          createdAt: audit.createdAt
        },
        message: 'SEO audit started successfully'
      });

    } catch (error) {
      console.error('SEO audit creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create SEO audit' },
        { status: 500 }
      );
    }
  }
);


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { seoAuditEngine } from '@/lib/seo-audit-engine';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const GET = enhancedRBAC.requireFeature(FEATURE_FLAGS.SEO_AUDIT)(
  async (req: NextRequest, user, { params }: { params: { siteId: string } }) => {
    try {
      const { siteId } = params;
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');

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

      // Get audits for site
      const audits = await seoAuditEngine.getAuditsForSite(siteId, limit);

      return NextResponse.json({
        success: true,
        audits,
        total: audits.length
      });

    } catch (error) {
      console.error('Get site SEO audits error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve SEO audits' },
        { status: 500 }
      );
    }
  }
);

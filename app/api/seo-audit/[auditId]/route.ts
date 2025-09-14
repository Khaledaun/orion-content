
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { seoAuditEngine } from '@/lib/seo-audit-engine';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const GET = enhancedRBAC.requireFeature(FEATURE_FLAGS.SEO_AUDIT)(
  async (req: NextRequest, user, { params }: { params: { auditId: string } }) => {
    try {
      const { auditId } = params;

      if (!auditId) {
        return NextResponse.json(
          { error: 'Audit ID is required' },
          { status: 400 }
        );
      }

      // Get audit details
      const audit = await seoAuditEngine.getAudit(auditId);
      
      if (!audit) {
        return NextResponse.json(
          { error: 'Audit not found' },
          { status: 404 }
        );
      }

      // Check if user has access to this audit's site
      const hasAccess = await enhancedRBAC.canAccessSite(user.id, audit.siteId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this audit' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        audit
      });

    } catch (error) {
      console.error('Get SEO audit error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve SEO audit' },
        { status: 500 }
      );
    }
  }
);


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { gscOAuth, GSC_DIMENSIONS } from '@/lib/integrations';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.GSC_INTEGRATION)(
  async (req: NextRequest, user) => {
    try {
      const { 
        siteId, 
        startDate = '30daysAgo', 
        endDate = 'yesterday',
        dimensions = [GSC_DIMENSIONS.QUERY],
        rowLimit = 1000
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

      // Fetch search analytics from GSC
      const data = await gscOAuth.fetchSearchAnalytics(siteId, {
        startDate,
        endDate,
        dimensions,
        rowLimit
      });

      return NextResponse.json({
        success: true,
        data,
        period: { startDate, endDate },
        dimensions,
        rowLimit
      });

    } catch (error) {
      console.error('GSC analytics error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch GSC analytics' },
        { status: 500 }
      );
    }
  }
);

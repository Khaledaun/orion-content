
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { ga4OAuth, GA4_METRICS, GA4_DIMENSIONS } from '@/lib/integrations';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.GA4_INTEGRATION)(
  async (req: NextRequest, user) => {
    try {
      const { 
        siteId, 
        startDate = '30daysAgo', 
        endDate = 'today',
        metrics = [GA4_METRICS.USERS, GA4_METRICS.SESSIONS, GA4_METRICS.PAGEVIEWS],
        dimensions = []
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

      // Fetch metrics from GA4
      const data = await ga4OAuth.fetchMetrics(siteId, {
        startDate,
        endDate,
        metrics,
        dimensions
      });

      return NextResponse.json({
        success: true,
        data,
        period: { startDate, endDate },
        metrics,
        dimensions
      });

    } catch (error) {
      console.error('GA4 metrics error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch GA4 metrics' },
        { status: 500 }
      );
    }
  }
);

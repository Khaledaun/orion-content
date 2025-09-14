
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { ga4OAuth } from '@/lib/integrations';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.GA4_INTEGRATION)(
  async (req: NextRequest, user) => {
    try {
      const { siteId } = await req.json();

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

      // Generate OAuth URL
      const { authUrl, state } = ga4OAuth.generateAuthUrl(siteId);

      return NextResponse.json({
        authUrl,
        state,
        message: 'Redirect to Google for authorization'
      });

    } catch (error) {
      console.error('GA4 connect error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate GA4 connection' },
        { status: 500 }
      );
    }
  }
);

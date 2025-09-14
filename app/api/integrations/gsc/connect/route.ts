
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { gscOAuth } from '@/lib/integrations';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.GSC_INTEGRATION)(
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
      const { authUrl, state } = gscOAuth.generateAuthUrl(siteId);

      return NextResponse.json({
        authUrl,
        state,
        message: 'Redirect to Google for authorization'
      });

    } catch (error) {
      console.error('GSC connect error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate GSC connection' },
        { status: 500 }
      );
    }
  }
);

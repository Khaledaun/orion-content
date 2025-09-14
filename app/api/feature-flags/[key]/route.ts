
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { featureFlags } from '@/lib/feature-flags';
import { SubscriptionTier } from '@prisma/client';

export const PUT = enhancedRBAC.requireRole('ADMIN')(
  async (req: NextRequest, user, { params }: { params: { key: string } }) => {
    try {
      const { key } = params;
      const updates = await req.json();

      if (!key) {
        return NextResponse.json(
          { error: 'Feature flag key is required' },
          { status: 400 }
        );
      }

      // Validate tier if provided
      if (updates.requiredTier && !Object.values(SubscriptionTier).includes(updates.requiredTier)) {
        return NextResponse.json(
          { error: 'Invalid required tier' },
          { status: 400 }
        );
      }

      const flag = await featureFlags.updateFeatureFlag(key, updates);

      return NextResponse.json({
        success: true,
        flag,
        message: 'Feature flag updated successfully'
      });

    } catch (error) {
      console.error('Update feature flag error:', error);
      return NextResponse.json(
        { error: 'Failed to update feature flag' },
        { status: 500 }
      );
    }
  }
);

export const GET = enhancedRBAC.requireRole('VIEWER')(
  async (req: NextRequest, user, { params }: { params: { key: string } }) => {
    try {
      const { key } = params;
      const { searchParams } = new URL(req.url);
      const checkTier = searchParams.get('tier') as SubscriptionTier || user.subscription.tier;

      if (!key) {
        return NextResponse.json(
          { error: 'Feature flag key is required' },
          { status: 400 }
        );
      }

      const config = await featureFlags.getFeatureConfig(key);
      const isEnabled = await featureFlags.isFeatureEnabled(key, checkTier);

      return NextResponse.json({
        success: true,
        key,
        config,
        isEnabled,
        checkedForTier: checkTier
      });

    } catch (error) {
      console.error('Get feature flag error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve feature flag' },
        { status: 500 }
      );
    }
  }
);


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { featureFlags } from '@/lib/feature-flags';
import { SubscriptionTier } from '@prisma/client';

export const GET = enhancedRBAC.requireRole('ADMIN')(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const userTier = searchParams.get('tier') as SubscriptionTier || user.subscription.tier;

      // Get all feature flags and their status for the user's tier
      const allFlags = Object.values(require('@/lib/feature-flags').FEATURE_FLAGS) as string[];
      const flagsStatus = await Promise.all(
        allFlags.map(async (key: string) => {
          const config = await featureFlags.getFeatureConfig(key);
          const isEnabled = await featureFlags.isFeatureEnabled(key, userTier);
          
          return {
            key,
            config,
            isEnabled,
            availableForTier: isEnabled
          };
        })
      );

      return NextResponse.json({
        success: true,
        flags: flagsStatus,
        userTier
      });

    } catch (error) {
      console.error('Get feature flags error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve feature flags' },
        { status: 500 }
      );
    }
  }
);

export const POST = enhancedRBAC.requireRole('ADMIN')(
  async (req: NextRequest, user) => {
    try {
      const {
        key,
        name,
        description,
        isEnabled,
        requiredTier,
        configuration = {}
      } = await req.json();

      // Validation
      if (!key || !name) {
        return NextResponse.json(
          { error: 'Missing required fields: key, name' },
          { status: 400 }
        );
      }

      if (!Object.values(SubscriptionTier).includes(requiredTier)) {
        return NextResponse.json(
          { error: 'Invalid required tier' },
          { status: 400 }
        );
      }

      const flag = await featureFlags.createFeatureFlag({
        key,
        name,
        description,
        isEnabled: isEnabled !== false,
        requiredTier,
        configuration
      });

      return NextResponse.json({
        success: true,
        flag,
        message: 'Feature flag created successfully'
      });

    } catch (error) {
      console.error('Create feature flag error:', error);
      return NextResponse.json(
        { error: 'Failed to create feature flag' },
        { status: 500 }
      );
    }
  }
);

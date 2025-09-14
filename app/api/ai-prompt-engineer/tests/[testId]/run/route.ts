
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { aiPromptEngineer } from '@/lib/ai-prompt-engineer';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user, { params }: { params: { testId: string } }) => {
    try {
      const { testId } = params;

      if (!testId) {
        return NextResponse.json(
          { error: 'Test ID is required' },
          { status: 400 }
        );
      }

      const result = await aiPromptEngineer.runPromptTest(testId);

      return NextResponse.json({
        success: true,
        result,
        message: 'Prompt test completed'
      });

    } catch (error) {
      console.error('Run prompt test error:', error);
      return NextResponse.json(
        { error: 'Failed to run prompt test' },
        { status: 500 }
      );
    }
  }
);


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { aiPromptEngineer } from '@/lib/ai-prompt-engineer';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user, { params }: { params: { templateId: string } }) => {
    try {
      const { templateId } = params;

      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const summary = await aiPromptEngineer.runAllPromptTests(templateId);

      return NextResponse.json({
        success: true,
        summary,
        message: `Test suite completed: ${summary.passed}/${summary.total} tests passed`
      });

    } catch (error) {
      console.error('Run all prompt tests error:', error);
      return NextResponse.json(
        { error: 'Failed to run test suite' },
        { status: 500 }
      );
    }
  }
);

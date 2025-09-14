
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { aiPromptEngineer } from '@/lib/ai-prompt-engineer';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user) => {
    try {
      const {
        templateId,
        name,
        inputData,
        expectedType
      } = await req.json();

      // Validation
      if (!templateId || !name || !inputData || !expectedType) {
        return NextResponse.json(
          { error: 'Missing required fields: templateId, name, inputData, expectedType' },
          { status: 400 }
        );
      }

      const test = await aiPromptEngineer.createPromptTest(templateId, {
        name,
        inputData,
        expectedType
      });

      return NextResponse.json({
        success: true,
        test,
        message: 'Prompt test created successfully'
      });

    } catch (error) {
      console.error('Create prompt test error:', error);
      return NextResponse.json(
        { error: 'Failed to create prompt test' },
        { status: 500 }
      );
    }
  }
);

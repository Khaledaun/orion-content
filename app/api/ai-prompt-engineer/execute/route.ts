
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
        inputData,
        providerId
      } = await req.json();

      // Validation
      if (!templateId || !inputData) {
        return NextResponse.json(
          { error: 'Missing required fields: templateId, inputData' },
          { status: 400 }
        );
      }

      const result = await aiPromptEngineer.executePrompt({
        templateId,
        inputData,
        providerId,
        userId: user.id
      });

      return NextResponse.json({
        success: true,
        result,
        message: 'Prompt executed successfully'
      });

    } catch (error) {
      console.error('Execute prompt error:', error);
      
      let errorMessage = 'Failed to execute prompt';
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('inactive')) {
          return NextResponse.json(
            { error: 'Prompt template not found or inactive' },
            { status: 404 }
          );
        }
        if (error.message.includes('Invalid input data')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        errorMessage = error.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  }
);

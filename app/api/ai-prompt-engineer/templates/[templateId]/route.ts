
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { aiPromptEngineer } from '@/lib/ai-prompt-engineer';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const GET = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user, { params }: { params: { templateId: string } }) => {
    try {
      const { templateId } = params;

      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const template = await aiPromptEngineer.getPromptTemplate(templateId);
      
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        template
      });

    } catch (error) {
      console.error('Get prompt template error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve prompt template' },
        { status: 500 }
      );
    }
  }
);

export const PUT = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user, { params }: { params: { templateId: string } }) => {
    try {
      const { templateId } = params;
      const updates = await req.json();

      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const template = await aiPromptEngineer.updatePromptTemplate(templateId, updates);

      return NextResponse.json({
        success: true,
        template,
        message: 'Prompt template updated successfully'
      });

    } catch (error) {
      console.error('Update prompt template error:', error);
      
      if (error instanceof Error && error.message.includes('system-managed')) {
        return NextResponse.json(
          { error: 'Cannot update system-managed templates' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update prompt template' },
        { status: 500 }
      );
    }
  }
);

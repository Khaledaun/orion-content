
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRBAC } from '@/lib/enhanced-rbac';
import { aiPromptEngineer } from '@/lib/ai-prompt-engineer';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export const GET = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category') || undefined;
      const isActive = searchParams.get('active') === 'true' ? true : 
                      searchParams.get('active') === 'false' ? false : undefined;

      const templates = await aiPromptEngineer.getPromptTemplatesByCategory(category, isActive);

      return NextResponse.json({
        success: true,
        templates
      });

    } catch (error) {
      console.error('Get prompt templates error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve prompt templates' },
        { status: 500 }
      );
    }
  }
);

export const POST = enhancedRBAC.requireFeature(FEATURE_FLAGS.AI_PROMPT_ENGINEER)(
  async (req: NextRequest, user) => {
    try {
      const {
        name,
        description,
        category,
        systemPrompt,
        userPromptSchema,
        roles = [],
        isActive = true
      } = await req.json();

      // Validation
      if (!name || !category || !systemPrompt || !userPromptSchema) {
        return NextResponse.json(
          { error: 'Missing required fields: name, category, systemPrompt, userPromptSchema' },
          { status: 400 }
        );
      }

      if (!['content', 'seo', 'social', 'analysis'].includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category. Must be one of: content, seo, social, analysis' },
          { status: 400 }
        );
      }

      const template = await aiPromptEngineer.createPromptTemplate({
        name,
        description,
        category,
        systemPrompt,
        userPromptSchema,
        roles,
        isActive
      }, user.id);

      return NextResponse.json({
        success: true,
        template,
        message: 'Prompt template created successfully'
      });

    } catch (error) {
      console.error('Create prompt template error:', error);
      return NextResponse.json(
        { error: 'Failed to create prompt template' },
        { status: 500 }
      );
    }
  }
);

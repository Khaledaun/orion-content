/**
 * AI Preference Learning API
 * Handles user preference learning and content personalization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEditAccess } from '@/app/lib/rbac';
import { AIPreferenceLearner, ContentComparison } from '@/lib/ai/preference-learner';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const body = await request.json();
    
    const { 
      siteId, 
      action,
      data = {}
    } = body;

    if (!siteId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: siteId, action' },
        { status: 400 }
      );
    }

    const preferenceLearner = new AIPreferenceLearner();

    switch (action) {
      case 'learn_from_comparison': {
        const { original, edited, userRating, feedback, contentType } = data;
        
        if (!original || !edited) {
          return NextResponse.json(
            { error: 'Missing original or edited content' },
            { status: 400 }
          );
        }

        const comparison: ContentComparison = {
          original,
          edited,
          changes: [], // Would be calculated by the learner
          userRating,
          feedback,
        };

        const preferences = await preferenceLearner.learnFromComparison(
          userId,
          siteId,
          comparison,
          contentType || 'blog'
        );

        if (preferences) {
          // Save preferences to database
          await prisma.userPreferences.upsert({
            where: {
              userId_siteId: {
                userId,
                siteId,
              },
            },
            update: {
              contentStyle: preferences.preferences,
              lastUpdated: new Date(),
            },
            create: {
              userId,
              siteId,
              contentStyle: preferences.preferences,
              keywordPreferences: {},
              structurePrefs: {},
              tonePreferences: {},
              seoPreferences: {},
            },
          });

          logger.info(
            { userId, siteId, confidence: preferences.confidence },
            'User preferences updated from content comparison'
          );
        }

        return NextResponse.json({
          success: true,
          preferences,
          message: 'Preferences learned from content comparison',
        });
      }

      case 'generate_personalized_content': {
        const { baseContent, contentType, keywords } = data;
        
        if (!baseContent) {
          return NextResponse.json(
            { error: 'Missing base content' },
            { status: 400 }
          );
        }

        const result = await preferenceLearner.generatePersonalizedContent(
          userId,
          siteId,
          baseContent,
          contentType || 'blog',
          keywords || []
        );

        return NextResponse.json({
          success: true,
          result,
          message: 'Personalized content generated',
        });
      }

      case 'get_learning_insights': {
        const insights = await preferenceLearner.getLearningInsights(userId, siteId);

        return NextResponse.json({
          success: true,
          insights,
          message: 'Learning insights retrieved',
        });
      }

      case 'get_user_preferences': {
        const preferences = await prisma.userPreferences.findUnique({
          where: {
            userId_siteId: {
              userId,
              siteId,
            },
          },
        });

        return NextResponse.json({
          success: true,
          preferences,
          message: 'User preferences retrieved',
        });
      }

      case 'update_preferences': {
        const { contentStyle, keywordPreferences, structurePrefs, tonePreferences, seoPreferences } = data;

        const preferences = await prisma.userPreferences.upsert({
          where: {
            userId_siteId: {
              userId,
              siteId,
            },
          },
          update: {
            contentStyle: contentStyle || {},
            keywordPreferences: keywordPreferences || {},
            structurePrefs: structurePrefs || {},
            tonePreferences: tonePreferences || {},
            seoPreferences: seoPreferences || {},
            lastUpdated: new Date(),
          },
          create: {
            userId,
            siteId,
            contentStyle: contentStyle || {},
            keywordPreferences: keywordPreferences || {},
            structurePrefs: structurePrefs || {},
            tonePreferences: tonePreferences || {},
            seoPreferences: seoPreferences || {},
          },
        });

        return NextResponse.json({
          success: true,
          preferences,
          message: 'User preferences updated',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      'AI preferences API failed'
    );

    return NextResponse.json(
      { 
        error: 'AI preferences operation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireEditAccess(request);
    const { searchParams } = new URL(request.url);
    
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId || !action) {
      return NextResponse.json(
        { error: 'Missing siteId or action parameter' },
        { status: 400 }
      );
    }

    const preferenceLearner = new AIPreferenceLearner();

    switch (action) {
      case 'preferences': {
        const preferences = await prisma.userPreferences.findUnique({
          where: {
            userId_siteId: {
              userId,
              siteId,
            },
          },
        });

        return NextResponse.json({
          success: true,
          preferences,
        });
      }

      case 'insights': {
        const insights = await preferenceLearner.getLearningInsights(userId, siteId);

        return NextResponse.json({
          success: true,
          insights,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error(
      { error: redactSensitive(error) },
      'AI preferences GET API failed'
    );

    return NextResponse.json(
      { error: 'AI preferences operation failed' },
      { status: 500 }
    );
  }
}

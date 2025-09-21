/**
 * Advanced Backlink Analysis API
 * Handles backlink analysis and link building campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEditAccess } from '@/app/lib/rbac';
import { BacklinkAnalyzer } from '@/lib/seo/backlink-analyzer';
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

    const backlinkAnalyzer = new BacklinkAnalyzer();

    switch (action) {
      case 'analyze_backlinks': {
        const { domain, competitors = [] } = data;
        
        if (!domain) {
          return NextResponse.json(
            { error: 'Missing domain for backlink analysis' },
            { status: 400 }
          );
        }

        logger.info(
          { userId, siteId, domain: redactSensitive(domain) },
          'Starting backlink analysis'
        );

        const analysis = await backlinkAnalyzer.analyzeBacklinks(domain, competitors);

        // Save analysis to database
        await prisma.backlinkProfile.upsert({
          where: { siteId },
          update: {
            totalBacklinks: analysis.totalBacklinks,
            domainAuthority: analysis.domainRating,
            referringDomains: analysis.referringDomains,
            topBacklinks: analysis.topBacklinks,
            competitors: analysis.competitorGaps,
            opportunities: analysis.opportunities,
            lastAnalyzed: new Date(),
          },
          create: {
            siteId,
            totalBacklinks: analysis.totalBacklinks,
            domainAuthority: analysis.domainRating,
            referringDomains: analysis.referringDomains,
            topBacklinks: analysis.topBacklinks,
            competitors: analysis.competitorGaps,
            opportunities: analysis.opportunities,
          },
        });

        return NextResponse.json({
          success: true,
          analysis,
          message: 'Backlink analysis completed',
        });
      }

      case 'find_opportunities': {
        const { domain, competitors = [] } = data;
        
        if (!domain) {
          return NextResponse.json(
            { error: 'Missing domain for opportunity analysis' },
            { status: 400 }
          );
        }

        const opportunities = await backlinkAnalyzer.findLinkBuildingOpportunities(domain, competitors);

        return NextResponse.json({
          success: true,
          opportunities,
          message: 'Link building opportunities found',
        });
      }

      case 'create_campaign': {
        const { name, targetDomain, opportunities } = data;
        
        if (!name || !targetDomain || !opportunities) {
          return NextResponse.json(
            { error: 'Missing required fields: name, targetDomain, opportunities' },
            { status: 400 }
          );
        }

        const campaign = await backlinkAnalyzer.createLinkBuildingCampaign(
          name,
          targetDomain,
          opportunities
        );

        // Save campaign to database
        const backlinkProfile = await prisma.backlinkProfile.findUnique({
          where: { siteId },
        });

        if (!backlinkProfile) {
          return NextResponse.json(
            { error: 'Backlink profile not found. Run backlink analysis first.' },
            { status: 404 }
          );
        }

        await prisma.linkBuildingCampaign.create({
          data: {
            name: campaign.name,
            targetDomain: campaign.targetDomain,
            siteId,
            backlinkProfileId: backlinkProfile.id,
            status: campaign.status,
            progress: campaign.progress,
            metrics: campaign.metrics,
            opportunities: campaign.opportunities,
          },
        });

        logger.info(
          { userId, siteId, campaignId: campaign.id },
          'Link building campaign created'
        );

        return NextResponse.json({
          success: true,
          campaign,
          message: 'Link building campaign created',
        });
      }

      case 'update_campaign_progress': {
        const { campaignId, progress } = data;
        
        if (!campaignId || !progress) {
          return NextResponse.json(
            { error: 'Missing campaignId or progress data' },
            { status: 400 }
          );
        }

        const campaign = await backlinkAnalyzer.updateCampaignProgress(campaignId, progress);

        // Update campaign in database
        await prisma.linkBuildingCampaign.update({
          where: { id: campaignId },
          data: {
            progress: campaign.progress,
            metrics: campaign.metrics,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          campaign,
          message: 'Campaign progress updated',
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
      'Backlink analysis API failed'
    );

    return NextResponse.json(
      { 
        error: 'Backlink analysis operation failed', 
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

    switch (action) {
      case 'profile': {
        const backlinkProfile = await prisma.backlinkProfile.findUnique({
          where: { siteId },
        });

        return NextResponse.json({
          success: true,
          profile: backlinkProfile,
        });
      }

      case 'campaigns': {
        const campaigns = await prisma.linkBuildingCampaign.findMany({
          where: { siteId },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
          success: true,
          campaigns,
        });
      }

      case 'campaign': {
        const campaignId = searchParams.get('campaignId');
        
        if (!campaignId) {
          return NextResponse.json(
            { error: 'Missing campaignId parameter' },
            { status: 400 }
          );
        }

        const campaign = await prisma.linkBuildingCampaign.findUnique({
          where: { id: campaignId },
        });

        if (!campaign) {
          return NextResponse.json(
            { error: 'Campaign not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          campaign,
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
      'Backlink analysis GET API failed'
    );

    return NextResponse.json(
      { error: 'Backlink analysis operation failed' },
      { status: 500 }
    );
  }
}

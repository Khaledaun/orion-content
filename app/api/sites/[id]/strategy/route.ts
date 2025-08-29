
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Site Strategy schema validation
const siteStrategySchema = z.object({
  site_persona: z.string().optional(),
  target_audience: z.string().optional(),
  eeat_guidelines: z.object({
    author_bio_template: z.string().optional(),
    preferred_sources: z.array(z.string()).optional(),
    tone_of_voice: z.array(z.string()).optional(),
  }).optional(),
  content_archetypes: z.array(z.object({
    name: z.string(),
    prompt_file: z.string(),
    priority: z.number().min(0).max(1),
  })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 20 } // 20 requests per minute
    })
    const resolvedParams = await params
    const siteId = resolvedParams.id

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      await auditLog({
        route: `/api/sites/${siteId}/strategy`,
        actor: user.email,
        action: 'get_strategy_site_not_found',
        metadata: { siteId }
      })
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Get site strategy
    const strategy = await prisma.siteStrategy.findUnique({
      where: { siteId },
    })

    await auditLog({
      route: `/api/sites/${siteId}/strategy`,
      actor: user.email,
      action: 'get_strategy_success',
      metadata: { 
        siteId,
        siteName: site.name,
        hasCustomStrategy: !!strategy
      }
    })

    return NextResponse.json(strategy?.strategy || {})
  } catch (error) {
    if (error instanceof NextResponse) {
      return error // Rate limit or auth error
    }
    
    console.error('Get site strategy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 300000, limit: 10 } // 10 updates per 5 minutes
    })
    const resolvedParams = await params
    const siteId = resolvedParams.id

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      await auditLog({
        route: `/api/sites/${siteId}/strategy`,
        actor: user.email,
        action: 'update_strategy_site_not_found',
        metadata: { siteId }
      })
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate strategy structure
    try {
      siteStrategySchema.parse(body)
    } catch (validationError) {
      await auditLog({
        route: `/api/sites/${siteId}/strategy`,
        actor: user.email,
        action: 'update_strategy_validation_failed',
        metadata: { siteId, validationError }
      })
      return NextResponse.json(
        { error: 'Invalid strategy format', details: validationError },
        { status: 400 }
      )
    }

    // Check if strategy exists for audit purposes
    const existingStrategy = await prisma.siteStrategy.findUnique({
      where: { siteId },
    })

    // Upsert site strategy
    const strategy = await prisma.siteStrategy.upsert({
      where: { siteId },
      update: {
        strategy: body,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        strategy: body,
      },
    })

    await auditLog({
      route: `/api/sites/${siteId}/strategy`,
      actor: user.email,
      action: existingStrategy ? 'update_strategy_success' : 'create_strategy_success',
      metadata: { 
        siteId,
        siteName: site.name,
        strategyKeys: Object.keys(body),
        wasExisting: !!existingStrategy
      }
    })

    return NextResponse.json(strategy, { status: existingStrategy ? 200 : 201 })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error // Rate limit or auth error
    }
    
    console.error('Update site strategy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

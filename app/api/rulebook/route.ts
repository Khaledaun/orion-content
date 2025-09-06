
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Global Rulebook schema validation
const globalRulebookSchema = z.object({
  eeat: z.object({
    require_author_bio: z.boolean(),
    require_citations: z.boolean(),
    allowed_source_domains: z.array(z.string()),
    citation_style: z.string(),
    tone_constraints: z.array(z.string()),
  }).optional(),
  seo: z.object({
    title_length: z.object({
      min: z.number(),
      max: z.number(),
    }),
    meta_description: z.object({
      min: z.number(),
      max: z.number(),
    }),
    h1_rules: z.object({
      must_include_primary_keyword: z.boolean(),
    }),
    internal_links_min: z.number(),
    outbound_links_min: z.number(),
    image_alt_required: z.boolean(),
    slug_style: z.string(),
  }).optional(),
  aio: z.object({
    summary_block_required: z.boolean(),
    qa_block_required: z.boolean(),
    structured_data: z.array(z.string()),
    answers_should_be_self_contained: z.boolean(),
    content_layout: z.array(z.string()),
  }).optional(),
  ai_search_visibility: z.object({
    clear_headings: z.boolean(),
    explicit_facts_with_sources: z.boolean(),
    avoid_fluff: z.boolean(),
    scannability_score_min: z.number(),
  }).optional(),
  prohibited: z.object({
    claims_without_source: z.boolean(),
    fabricated_stats: z.boolean(),
    over_optimization_patterns: z.array(z.string()),
  }).optional(),
  score_weights: z.object({
    eeat: z.number(),
    seo: z.number(),
    aio: z.number(),
    ai_search_visibility: z.number(),
  }).optional(),
  enforcement: z.object({
    default_min_quality_score: z.number(),
    block_publish_if_below: z.boolean(),
    tag_if_below: z.string(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 10 } // 10 requests per minute
    })

    const prisma = await getPrismaClient()
    // Get the latest rulebook
    const rulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' },
    })

    if (!rulebook) {
      await auditLog({
        route: '/api/rulebook',
        actor: user.email,
        action: 'get_rulebook_not_found'
      })
      return NextResponse.json(
        { error: 'No rulebook found' },
        { status: 404 }
      )
    }

    await auditLog({
      route: '/api/rulebook',
      actor: user.email,
      action: 'get_rulebook_success',
      metadata: { version: rulebook.version }
    })

    return NextResponse.json(rulebook)
  } catch (error) {
    if (error instanceof NextResponse) {
      return error // Rate limit or auth error
    }
    
    console.error('Get rulebook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 300000, limit: 5 } // 5 updates per 5 minutes
    })

    const { rules, sources, notes } = await request.json()

    if (!rules) {
      await auditLog({
        route: '/api/rulebook',
        actor: user.email,
        action: 'create_rulebook_failed',
        metadata: { reason: 'missing_rules' }
      })
      return NextResponse.json(
        { error: 'Rules are required' },
        { status: 400 }
      )
    }

    // Validate rules structure
    try {
      globalRulebookSchema.parse(rules)
    } catch (validationError) {
      await auditLog({
        route: '/api/rulebook',
        actor: user.email,
        action: 'create_rulebook_failed',
        metadata: { reason: 'validation_error', details: validationError }
      })
      return NextResponse.json(
        { error: 'Invalid rulebook format', details: validationError },
        { status: 400 }
      )
    }

    const prisma = await getPrismaClient()
    // Get the current highest version
    const latestRulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' },
    })

    const newVersion = (latestRulebook?.version || 0) + 1

    // Create new rulebook version (current active one)
    const newRulebook = await prisma.globalRulebook.create({
      data: {
        version: newVersion,
        rules,
        sources: sources || [],
        updatedBy: user.email,
      },
    })

    // Also append to version history
    await prisma.rulebookVersion.create({
      data: {
        version: newVersion,
        rules,
        sources: sources || [],
        notes: notes || `Version ${newVersion} created by ${user.email}`,
      },
    })

    await auditLog({
      route: '/api/rulebook',
      actor: user.email,
      action: 'create_rulebook_success',
      metadata: { 
        version: newVersion,
        previousVersion: latestRulebook?.version,
        rulesKeys: Object.keys(rules)
      }
    })

    return NextResponse.json(newRulebook, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error // Rate limit or auth error
    }
    
    console.error('Create rulebook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

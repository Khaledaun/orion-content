import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const strategySchema = z.object({
  contentTypes: z.array(z.string()).optional(),
  targetKeywords: z.array(z.string()).optional(),
  contentGuidelines: z.object({
    tone: z.string().optional(),
    style: z.string().optional(),
    wordCount: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
  seoPreferences: z.object({
    focusKeywords: z.boolean().optional(),
    metaDescriptions: z.boolean().optional(),
    internalLinking: z.boolean().optional(),
  }).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 30 }
    })

    const resolvedParams = await params
    const siteId = resolvedParams.id

    // Placeholder implementation since site/strategy models don't exist yet
    const mockStrategy = {
      id: `strategy-${siteId}`,
      siteId,
      strategy: {
        contentTypes: ['blog', 'article'],
        targetKeywords: ['example', 'sample'],
        contentGuidelines: {
          tone: 'professional',
          style: 'informative',
          wordCount: { min: 500, max: 2000 }
        },
        seoPreferences: {
          focusKeywords: true,
          metaDescriptions: true,
          internalLinking: true
        }
      },
      note: 'Placeholder - requires site/strategy models'
    }

    await auditLog({
      route: `/api/sites/${siteId}/strategy`,
      actor: user.email,
      action: 'get_strategy_success',
      metadata: { 
        siteId,
        siteName: `Site ${siteId}`,
        hasCustomStrategy: true
      }
    })

    return NextResponse.json(mockStrategy.strategy)
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    console.error('Get strategy error:', error)
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
      rateLimitConfig: { windowMs: 300000, limit: 10 }
    })

    const resolvedParams = await params
    const siteId = resolvedParams.id
    const body = await request.json()
    
    const strategyData = strategySchema.parse(body)

    // Placeholder implementation since site/strategy models don't exist yet
    const mockUpdatedStrategy = {
      id: `strategy-${siteId}`,
      siteId,
      strategy: strategyData,
      updatedAt: new Date().toISOString(),
      note: 'Placeholder - requires site/strategy models'
    }

    await auditLog({
      route: `/api/sites/${siteId}/strategy`,
      actor: user.email,
      action: 'update_strategy_success',
      metadata: { 
        siteId,
        siteName: `Site ${siteId}`,
        strategyKeys: Object.keys(strategyData)
      }
    })

    return NextResponse.json(mockUpdatedStrategy, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    console.error('Update strategy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
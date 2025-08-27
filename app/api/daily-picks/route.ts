
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const siteKey = searchParams.get('site')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')

    let where: any = {}

    if (siteKey) {
      where.site = { key: siteKey }
    }

    if (category) {
      where.category = { name: category }
    }

    const topics = await prisma.topic.findMany({
      where: {
        ...where,
        approved: true,
      },
      include: {
        site: true,
        category: true,
        week: true,
      },
      orderBy: { score: 'desc' },
      take: limit,
    })

    return NextResponse.json(topics)
  } catch (error) {
    console.error('Get daily picks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

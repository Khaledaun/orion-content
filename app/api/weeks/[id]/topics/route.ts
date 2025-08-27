
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const { topics } = await request.json()

    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'Topics must be an array' },
        { status: 400 }
      )
    }

    const createdTopics = await prisma.topic.createMany({
      data: topics.map((topic: any) => ({
        weekId: params.id,
        siteId: topic.siteId,
        categoryId: topic.categoryId,
        title: topic.title,
        angle: topic.angle || null,
        score: topic.score || null,
        approved: topic.approved || false,
      })),
    })

    return NextResponse.json({ count: createdTopics.count })
  } catch (error) {
    console.error('Bulk insert topics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

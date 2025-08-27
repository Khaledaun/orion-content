
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()

    const weeks = await prisma.week.findMany({
      orderBy: { isoWeek: 'desc' },
      include: {
        _count: {
          select: { topics: true }
        }
      }
    })

    return NextResponse.json(weeks)
  } catch (error) {
    console.error('Get weeks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { isoWeek } = await request.json()

    if (!isoWeek) {
      return NextResponse.json(
        { error: 'ISO week is required' },
        { status: 400 }
      )
    }

    const existingWeek = await prisma.week.findUnique({
      where: { isoWeek },
    })

    if (existingWeek) {
      return NextResponse.json(
        { error: 'Week already exists' },
        { status: 400 }
      )
    }

    const week = await prisma.week.create({
      data: {
        isoWeek,
        status: 'PENDING',
      },
    })

    return NextResponse.json(week)
  } catch (error) {
    console.error('Create week error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

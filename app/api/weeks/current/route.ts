
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()

    // Get current ISO week
    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    const isoWeek = `${year}-${weekNumber.toString().padStart(2, '0')}`

    let week = await prisma.week.findUnique({
      where: { isoWeek },
      include: {
        topics: {
          include: {
            site: true,
            category: true,
          },
        },
      },
    })

    if (!week) {
      week = await prisma.week.create({
        data: {
          isoWeek,
          status: 'PENDING',
        },
        include: {
          topics: {
            include: {
              site: true,
              category: true,
            },
          },
        },
      })
    }

    return NextResponse.json(week)
  } catch (error) {
    console.error('Get current week error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

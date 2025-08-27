
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { jobType, startedAt, endedAt, ok, logUrl, notes } = await request.json()

    if (!jobType || !startedAt) {
      return NextResponse.json(
        { error: 'jobType and startedAt are required' },
        { status: 400 }
      )
    }

    const jobRun = await prisma.jobRun.create({
      data: {
        jobType,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
        ok: ok || false,
        logUrl: logUrl || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(jobRun)
  } catch (error) {
    console.error('Create job run error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    await requireAuth()

    const jobRuns = await prisma.jobRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(jobRuns)
  } catch (error) {
    console.error('Get job runs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

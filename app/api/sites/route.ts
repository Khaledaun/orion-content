
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()

    const sites = await prisma.site.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { categories: true, topics: true }
        }
      }
    })

    return NextResponse.json(sites)
  } catch (error) {
    console.error('Get sites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { name, key, timezone = 'UTC', publisher } = await request.json()

    if (!name || !key) {
      return NextResponse.json(
        { error: 'Name and key are required' },
        { status: 400 }
      )
    }

    const existingSite = await prisma.site.findUnique({
      where: { key },
    })

    if (existingSite) {
      return NextResponse.json(
        { error: 'Site key already exists' },
        { status: 400 }
      )
    }

    const site = await prisma.site.create({
      data: {
        name,
        key,
        timezone,
        publisher: publisher || null,
      },
    })

    return NextResponse.json(site)
  } catch (error) {
    console.error('Create site error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

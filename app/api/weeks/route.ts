export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/withAuth'
import { prisma } from '@/lib/prisma'

function getCurrentISOWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const week = getISOWeek(now)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const jan4 = new Date(target.getFullYear(), 0, 4)
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000
  return 1 + Math.ceil(dayDiff / 7)
}

async function weeksHandler(req: NextRequest, user: any, roles: string[]) {
  if (req.method === 'GET') {
    try {
      const weeks = await prisma.week.findMany({
        include: {
          topics: {
            include: {
              site: { select: { name: true, key: true } },
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ weeks })
    } catch (error) {
      console.error('Error fetching weeks:', error)
      return NextResponse.json({ error: 'Failed to fetch weeks' }, { status: 500 })
    }
  }
  if (req.method === 'POST') {
    // Example RBAC: require 'editor' role for POST
    if (!roles.includes('editor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    try {
      const currentIsoWeek = getCurrentISOWeek()
      const week = await prisma.week.upsert({
        where: { isoWeek: currentIsoWeek },
        create: { isoWeek: currentIsoWeek, status: 'PENDING' },
        update: {},
      })
      return NextResponse.json({ week })
    } catch (error) {
      console.error('Error creating/fetching week:', error)
      return NextResponse.json({ error: 'Failed to create/fetch week' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withAuth((weeksHandler as any))
export const POST = withAuth((weeksHandler as any))

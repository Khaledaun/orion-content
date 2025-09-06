export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth'
import { getPrismaClient } from '@/lib/prisma'

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

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const currentIsoWeek = getCurrentISOWeek()
    const prisma = await getPrismaClient()
    
    const week = await prisma.week.findUnique({
      where: { isoWeek: currentIsoWeek },
      include: {
        topics: {
          include: {
            site: { select: { name: true, key: true } },
            category: { select: { name: true } },
          },
        },
      },
    })
    
    if (!week) {
      return NextResponse.json({ 
        error: 'Current week not found',
        currentIsoWeek 
      }, { status: 404 })
    }
    
    return NextResponse.json({ week })
  } catch (error) {
    console.error('Error fetching current week:', error)
    return NextResponse.json({ error: 'Failed to fetch current week' }, { status: 500 })
  }
}

export const GET = requireApiAuth(handler)

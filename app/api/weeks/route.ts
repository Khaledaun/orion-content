import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateBearer } from '@/lib/bearer-auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateBearer(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        error: authResult.error || 'Unauthorized' 
      }, { status: 401 })
    }

    const weeks = await prisma.week.findMany({
      orderBy: { isoWeek: 'desc' }
    })

    return NextResponse.json({ weeks })
  } catch (error) {
    console.error('Weeks API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateBearer(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        error: authResult.error || 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { isoWeek, status } = body

    if (!isoWeek) {
      return NextResponse.json({ 
        error: 'Missing required field: isoWeek' 
      }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}$/.test(isoWeek)) {
      return NextResponse.json({ 
        error: 'Invalid isoWeek format. Expected YYYY-WW (e.g., 2024-01)' 
      }, { status: 400 })
    }

    const week = await prisma.week.create({
      data: {
        isoWeek,
        status: status || 'PENDING'
      }
    })

    return NextResponse.json({ week })
  } catch (error) {
    console.error('Create week error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Week already exists' 
      }, { status: 409 })
    }
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

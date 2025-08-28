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

    const sites = await prisma.site.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { categories: true, topics: true }
        }
      }
    })

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Sites API error:', error)
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
    const { key, name, timezone, publisher, locales } = body

    if (!key || !name) {
      return NextResponse.json({ 
        error: 'Missing required fields: key, name' 
      }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        key,
        name,
        timezone: timezone || 'UTC',
        publisher,
        locales
      }
    })

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Create site error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

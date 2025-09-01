
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const siteKey = searchParams.get('site')
    const count = parseInt(searchParams.get('count') || '3', 10)
    
    if (!date || !siteKey) {
      return NextResponse.json({ 
        error: 'date and site parameters are required' 
      }, { status: 400 })
    }
    
    // Find site
    const site = await prisma.site.findUnique({
      where: { key: siteKey }
    })
    
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }
    
    // Get current week
    const currentWeek = await prisma.week.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!currentWeek) {
      return NextResponse.json({ 
        error: 'No approved week found' 
      }, { status: 404 })
    }
    
    // Simple algorithm: get topics from distinct categories for the site
    const topics = await prisma.$queryRaw`
      WITH DistinctCategories AS (
        SELECT DISTINCT "categoryId"
        FROM "Topic"
        WHERE "weekId" = ${currentWeek.id}
        AND "siteId" = ${site.id}
        AND "approved" = true
        ORDER BY "categoryId"
        LIMIT ${count}
      )
      SELECT t.*, s.name as "siteName", c.name as "categoryName"
      FROM "Topic" t
      JOIN "Site" s ON t."siteId" = s.id
      JOIN "Category" c ON t."categoryId" = c.id
      WHERE t."categoryId" IN (SELECT "categoryId" FROM DistinctCategories)
      AND t."weekId" = ${currentWeek.id}
      AND t."siteId" = ${site.id}
      AND t."approved" = true
      ORDER BY t.score DESC NULLS LAST, RANDOM()
    ` as any[]
    
    // Take one from each category (up to count)
    const picks = []
    const usedCategories = new Set()
    
    for (const topic of topics) {
      if (picks.length >= count) break
      if (usedCategories.has(topic.categoryId)) continue
      
      picks.push(topic)
      usedCategories.add(topic.categoryId)
    }
    
    return NextResponse.json({ 
      picks,
      date,
      site: siteKey,
      weekId: currentWeek.id
    })
  } catch (error) {
    console.error('Error getting daily picks:', error)
    return NextResponse.json({ error: 'Failed to get daily picks' }, { status: 500 })
  }
}

export const GET = requireAuth(handler)

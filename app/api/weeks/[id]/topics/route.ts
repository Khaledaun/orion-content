
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const topicsSchema = z.object({
  topics: z.array(z.object({
    siteId: z.string(),
    categoryId: z.string(),
    title: z.string().min(1),
    angle: z.string().optional(),
    score: z.number().optional(),
    approved: z.boolean().default(false),
  }))
})

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const { id: weekId } = params
    const body = await req.json()
    const { topics } = topicsSchema.parse(body)
    
    // Verify week exists
    const week = await prisma.week.findUnique({
      where: { id: weekId }
    })
    
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }
    
    // Create topics
    const createdTopics = await prisma.topic.createMany({
      data: topics.map(topic => ({
        ...topic,
        weekId,
      }))
    })
    
    return NextResponse.json({ 
      created: createdTopics.count,
      weekId 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error creating topics:', error)
    return NextResponse.json({ error: 'Failed to create topics' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)

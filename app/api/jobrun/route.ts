
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const jobRunSchema = z.object({
  jobType: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  ok: z.boolean().optional(),
  logUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const body = await req.json()
    const data = jobRunSchema.parse(body)
    
    const jobRun = await prisma.jobRun.create({
      data: {
        ...data,
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      },
    })
    
    return NextResponse.json({ jobRun })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error creating job run:', error)
    return NextResponse.json({ error: 'Failed to create job run' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireApiAuth(req, { roles: ["admin", "editor"] })
    return await handler(req)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const { id } = params
    
    const week = await prisma.week.update({
      where: { id },
      data: { status: 'APPROVED' },
    })
    
    return NextResponse.json({ week })
  } catch (error) {
    console.error('Error approving week:', error)
    return NextResponse.json({ error: 'Failed to approve week' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)

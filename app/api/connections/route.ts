
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const connections = await prisma.connection.findMany({
      select: { 
        id: true,
        kind: true, 
        createdAt: true, 
        updatedAt: true 
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch connections' 
    }, { status: 500 })
  }
}

export const GET = requireAuth(handler)

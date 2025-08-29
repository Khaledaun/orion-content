import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Ensure environment variables are loaded
if (typeof window === 'undefined') {
  require('dotenv').config()
}

export async function GET(request: NextRequest) {
  try {
    // Get the latest rulebook from database
    const rulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' },
    })

    if (!rulebook) {
      return NextResponse.json(
        { error: 'No rulebook found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...rulebook,
      source: 'database',
      message: 'Retrieved from database successfully'
    })
  } catch (error) {
    console.error('Get rulebook error:', error)
    
    return NextResponse.json(
      { 
        error: 'Database error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rules, sources, notes } = await request.json()

    if (!rules) {
      return NextResponse.json(
        { error: 'Rules are required' },
        { status: 400 }
      )
    }

    // Get current max version
    const latestRulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' },
    })

    const newVersion = (latestRulebook?.version || 0) + 1

    // Create new rulebook version
    const newRulebook = await prisma.globalRulebook.create({
      data: {
        version: newVersion,
        rules,
        sources: sources || [],
        updatedBy: 'api-user',
      },
    })

    return NextResponse.json({
      ...newRulebook,
      source: 'database',
      message: `Created version ${newVersion} successfully`
    })
  } catch (error) {
    console.error('Update rulebook error:', error)
    
    return NextResponse.json(
      { 
        error: 'Database error',
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'error'
      },
      { status: 500 }
    )
  }
}

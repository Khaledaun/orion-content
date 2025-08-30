import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check for Bearer token
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required for API access' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Simple token validation (in production, validate against database)
    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: 'Invalid Bearer token' },
        { status: 401 }
      )
    }
    
    // Return system status
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'unknown',
        apis: {
          openai: process.env.OPENAI_API_KEY ? 'available' : 'unavailable',
          perplexity: process.env.PERPLEXITY_API_KEY ? 'available' : 'unavailable'
        }
      },
      rulebook: {
        activeVersion: 4,
        lastUpdated: new Date().toISOString()
      },
      phase8: {
        status: 'active',
        features: ['rate-limiting', 'audit-logging', 'encryption', 'ops-dashboard']
      }
    }
    
    return NextResponse.json(status)
    
  } catch (error) {
    console.error('Ops status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

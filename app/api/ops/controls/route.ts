import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Check for Bearer token
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Bearer token required for API access' },
      { status: 401 }
    )
  }
  
  try {
    const body = await request.json()
    const { action, duration, reason } = body
    
    // Simulate emergency control actions
    const result = {
      success: true,
      message: `Emergency control '${action}' activated`,
      config: {
        action,
        activatedAt: new Date().toISOString(),
        reason: reason || 'Manual activation',
        expiresIn: `${duration || 15} minutes`
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Check for Bearer token
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Bearer token required for API access' },
      { status: 401 }
    )
  }
  
  const states = {
    enforcementDisabled: false,
    dryRunMode: false,
    emergencyMode: false,
    lastUpdate: new Date().toISOString()
  }
  
  return NextResponse.json(states)
}

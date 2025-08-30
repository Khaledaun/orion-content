import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ 
    message: 'Strategy API works!',
    siteId: params.id,
    timestamp: new Date().toISOString(),
    method: 'GET'
  })
}

export async function POST(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ 
    message: 'Strategy POST works!',
    siteId: params.id,
    timestamp: new Date().toISOString(),
    method: 'POST'
  })
}

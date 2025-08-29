import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ 
    message: 'Strategy API works!',
    siteId: params.id,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString()
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ 
    message: 'Strategy POST works!',
    siteId: params.id,
    received: body,
    timestamp: new Date().toISOString()
  })
}

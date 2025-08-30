import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'API test works!', 
    location: 'correct-location',
    timestamp: new Date().toISOString() 
  })
}

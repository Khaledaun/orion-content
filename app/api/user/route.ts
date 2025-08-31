
import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth' // Disabled due to missing export

export async function GET(req: NextRequest) {
  try {
  // const user = await getSession()
  // if (!user) {
  //   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  // }
  // return NextResponse.json({ email: user.email })
  return NextResponse.json({ email: 'unknown' })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

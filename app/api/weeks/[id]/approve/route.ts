
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  try {
    // Extract id from URL
    const urlParts = req.url.split('/')
    const id = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1]
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
export async function POST(req: NextRequest) {
  try {
    await requireApiAuth(req, { roles: ["admin"] })
    return await handler(req)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

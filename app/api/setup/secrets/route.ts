
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptJson } from '@/lib/crypto-gcm'
// import { encryptJson } from '@/lib/crypto' // Disabled due to missing module

const secretSchema = z.object({
  kind: z.string().min(1),
  data: z.record(z.any()),
})

async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const { kind, data } = secretSchema.parse(body)
      
      const encrypted = encryptJson(data)
      
      await prisma.connection.upsert({
        where: { kind },
        create: {
          kind,
          dataEnc: encrypted,
        },
        update: {
          dataEnc: encrypted,
        },
      })
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error saving secret:', error)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  }
  
  if (req.method === 'GET') {
    try {
      const connections = await prisma.connection.findMany({
        select: { kind: true, createdAt: true, updatedAt: true },
      })
      
      return NextResponse.json({ connections })
    } catch (error) {
      console.error('Error fetching connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function GET(req: NextRequest) {
  try {
    await requireApiAuth(req, { roles: ["admin"] })
    return await handler(req)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

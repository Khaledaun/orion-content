export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/withAuth'
import { prisma } from '@/lib/prisma'

const siteSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  timezone: z.string().optional().default('UTC'),
  publisher: z.string().optional().default('wordpress'),
  locales: z.array(z.string()).optional().default(['en']),
})

async function sitesHandler(req: NextRequest, user: any, roles: string[]) {
  if (req.method === 'GET') {
    try {
      const sites = await prisma.site.findMany({
        include: { categories: true },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ sites })
    } catch (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }
  }
  if (req.method === 'POST') {
    // Example RBAC: require 'admin' role for POST
    if (!roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    try {
      const body = await req.json()
      const data = siteSchema.parse(body)
      const site = await prisma.site.create({
        data: { ...data, locales: data.locales },
        include: { categories: true },
      })
      return NextResponse.json({ site })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 })
      }
      console.error('Error creating site:', error)
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withAuth((sitesHandler as any))
export const POST = withAuth((sitesHandler as any))

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/withAuth';
import { prisma } from '@/lib/prisma';

const siteSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  timezone: z.string().optional().default('UTC'),
  publisher: z.string().optional().default('wordpress'),
  locales: z.array(z.string()).optional().default(['en']),
});

async function sitesHandler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const sites = await prisma.site.findMany({
        include: { categories: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ sites });
    } catch (error) {
      console.error('Error fetching sites:', error);
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = siteSchema.parse(await req.json());
      const site = await prisma.site.create({
        data: { ...data, locales: data.locales },
        include: { categories: true },
      });
      return NextResponse.json({ site });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 });
      }
      console.error('Error creating site:', error);
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// GET: signed-in only (withAuth default we wrote)
// POST: must be ADMIN
export const GET = withAuth(sitesHandler);
export const POST = withAuth(sitesHandler, { role: "ADMIN" });

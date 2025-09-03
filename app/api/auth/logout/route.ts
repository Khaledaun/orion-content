export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server'

export async function POST() {
  // Implement logout logic here if needed
  return NextResponse.json({ success: true })
}

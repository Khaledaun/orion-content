export const dynamic = "force-dynamic";

import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  await requireAuth()
  redirect('/dashboard')
}

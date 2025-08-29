
import { requireSessionAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  await requireSessionAuth()
  redirect('/dashboard')
}

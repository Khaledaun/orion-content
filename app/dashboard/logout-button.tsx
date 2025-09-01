
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Logged out successfully')
        router.push('/login')
      } else {
        toast.error('Logout failed')
      }
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} size="sm">
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  )
}

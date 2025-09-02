'use client'


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'

interface ApproveButtonProps {
  weekId: string
}

export default function ApproveButton({ weekId }: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleApprove = async () => {
    setIsLoading(true)

    try {
      const res = await fetch(`/api/weeks/${weekId}/approve`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Week approved successfully')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to approve week')
      }
    } catch (error) {
      toast.error('Failed to approve week')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleApprove} 
      disabled={isLoading}
      className="w-full"
      size="sm"
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      {isLoading ? 'Approving...' : 'Approve Week'}
    </Button>
  )
}

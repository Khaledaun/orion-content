
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function CreateSiteForm() {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [publisher, setPublisher] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, key, timezone, publisher: publisher || null }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Site created successfully')
        setName('')
        setKey('')
        setTimezone('UTC')
        setPublisher('')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to create site')
      }
    } catch (error) {
      toast.error('Failed to create site')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Site Name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Content Site"
          />
        </div>
        <div>
          <Label htmlFor="key">Site Key</Label>
          <Input
            id="key"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="my-content-site"
          />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="UTC"
          />
        </div>
        <div>
          <Label htmlFor="publisher">Publisher (Optional)</Label>
          <Input
            id="publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="Publisher Name"
          />
        </div>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Site'}
      </Button>
    </form>
  )
}

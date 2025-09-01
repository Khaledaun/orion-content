
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, BarChart3, Hash, FileText, Info } from 'lucide-react'

interface GA4StepProps {
  onComplete: (stepId: string, data?: any) => void
  loading: boolean
  status: any
}

export function GA4Step({ onComplete, loading, status }: GA4StepProps) {
  const [useDummy, setUseDummy] = useState(true)
  const [formData, setFormData] = useState({
    propertyId: '',
    serviceAccountJson: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      credentials: useDummy ? { useDummy: true } : formData
    }
    
    onComplete('ga4', data)
  }

  const isFormValid = useDummy || (
    formData.propertyId && formData.serviceAccountJson
  )

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Google Analytics 4 integration provides detailed visitor analytics and conversion tracking.
          For the MVP demo, we'll use simulated analytics data.
        </AlertDescription>
      </Alert>

      {/* Dummy Credentials Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Switch
              checked={useDummy}
              onCheckedChange={setUseDummy}
              id="use-dummy"
            />
            <div className="space-y-1">
              <Label htmlFor="use-dummy" className="text-base font-medium">
                Use dummy credentials
              </Label>
              <p className="text-sm text-muted-foreground">
                Perfect for testing and demo purposes
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!useDummy && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId" className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>GA4 Property ID</span>
              </Label>
              <Input
                id="propertyId"
                type="text"
                placeholder="123456789"
                value={formData.propertyId}
                onChange={(e) => handleInputChange('propertyId', e.target.value)}
                required={!useDummy}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your GA4 property settings (Admin → Property Settings)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceAccount" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Service Account JSON</span>
              </Label>
              <Textarea
                id="serviceAccount"
                placeholder="Paste your service account JSON here..."
                value={formData.serviceAccountJson}
                onChange={(e) => handleInputChange('serviceAccountJson', e.target.value)}
                required={!useDummy}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Download this from your Google Cloud Console → IAM & Admin → Service Accounts
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Setup Instructions:</strong><br />
                1. Create a project in Google Cloud Console<br />
                2. Enable the Google Analytics Data API<br />
                3. Create a service account and download the JSON key<br />
                4. Add the service account email as a user in your GA4 property
              </AlertDescription>
            </Alert>
          </div>
        )}

        {useDummy && (
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Demo Mode</span>
              </CardTitle>
              <CardDescription className="text-purple-700">
                Using dummy Google Analytics 4 credentials for demonstration purposes.
                This will simulate analytics data and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-purple-600 space-y-1">
                <p><strong>Property ID:</strong> 123456789</p>
                <p><strong>Service Account:</strong> ga4-service@example-project.iam.gserviceaccount.com</p>
                <p><strong>Status:</strong> Ready to connect</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={!isFormValid || loading}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect GA4'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

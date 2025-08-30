
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Globe, Key, User, Info } from 'lucide-react'

interface WordPressStepProps {
  onComplete: (stepId: string, data?: any) => void
  loading: boolean
  status: any
}

export function WordPressStep({ onComplete, loading, status }: WordPressStepProps) {
  const [useDummy, setUseDummy] = useState(true)
  const [formData, setFormData] = useState({
    siteUrl: '',
    username: '',
    password: '',
    applicationPassword: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      credentials: useDummy ? { useDummy: true } : formData
    }
    
    onComplete('wordpress', data)
  }

  const isFormValid = useDummy || (
    formData.siteUrl && 
    formData.username && 
    (formData.password || formData.applicationPassword)
  )

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is an MVP demo. You can use dummy credentials to simulate the WordPress integration, 
          or enter real credentials (they will be encrypted but not actually used to connect).
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
              <Label htmlFor="siteUrl" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>WordPress Site URL</span>
              </Label>
              <Input
                id="siteUrl"
                type="url"
                placeholder="https://yoursite.com"
                value={formData.siteUrl}
                onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                required={!useDummy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Username</span>
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required={!useDummy}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appPassword" className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Application Password</span>
                </Label>
                <Input
                  id="appPassword"
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={formData.applicationPassword}
                  onChange={(e) => handleInputChange('applicationPassword', e.target.value)}
                />
              </div>
            </div>

            <Alert>
              <AlertDescription>
                We recommend using Application Passwords for better security. 
                You can generate one in your WordPress admin under Users → Profile → Application Passwords.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {useDummy && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Demo Mode</CardTitle>
              <CardDescription className="text-blue-700">
                Using dummy WordPress credentials for demonstration purposes.
                This will simulate a successful WordPress connection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-600 space-y-1">
                <p><strong>Site URL:</strong> https://example-site.com</p>
                <p><strong>Username:</strong> admin</p>
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
              'Connect WordPress'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

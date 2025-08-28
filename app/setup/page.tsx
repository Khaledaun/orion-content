
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateApiToken } from '@/lib/crypto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'

interface SiteData {
  key: string
  name: string
  timezone: string
  publisher: string
  locales: string[]
}

interface ConnectorData {
  openai?: { apiKey: string }
  searchProvider?: 'CSE' | 'BING'
  searchCse?: { id: string; key: string }
  searchBing?: { key: string }
  wordpress?: { baseUrl: string; user: string; appPassword: string }
  apiToken?: string
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('site')
  
  const [siteData, setSiteData] = useState<SiteData>({
    key: '',
    name: '',
    timezone: 'UTC',
    publisher: 'wordpress',
    locales: ['en']
  })
  
  const [connectorData, setConnectorData] = useState<ConnectorData>({
    searchProvider: 'CSE'
  })
  
  const [secrets, setSecrets] = useState<string[]>([])
  const [githubResult, setGithubResult] = useState<{ written: number; names: string[] } | null>(null)

  const handleCreateSite = async () => {
    if (!siteData.key || !siteData.name) {
      toast.error('Site key and name are required')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData),
      })
      
      if (!response.ok) throw new Error('Failed to create site')
      
      toast.success('Site created successfully')
      setCurrentTab('connectors')
    } catch (error) {
      toast.error('Failed to create site')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateApiToken = () => {
    const token = generateApiToken()
    setConnectorData(prev => ({ ...prev, apiToken: token }))
    toast.success('API token generated')
  }

  const handleSaveSecrets = async () => {
    setLoading(true)
    const savedSecrets: string[] = []
    
    try {
      // Save OpenAI
      if (connectorData.openai?.apiKey) {
        const response = await fetch('/api/setup/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'openai',
            data: connectorData.openai
          }),
        })
        
        if (response.ok) savedSecrets.push('OpenAI')
      }
      
      // Save search provider
      if (connectorData.searchProvider === 'CSE' && connectorData.searchCse?.id && connectorData.searchCse?.key) {
        const response = await fetch('/api/setup/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'search_cse',
            data: connectorData.searchCse
          }),
        })
        
        if (response.ok) savedSecrets.push('Google CSE')
      }
      
      if (connectorData.searchProvider === 'BING' && connectorData.searchBing?.key) {
        const response = await fetch('/api/setup/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'search_bing',
            data: connectorData.searchBing
          }),
        })
        
        if (response.ok) savedSecrets.push('Bing Search')
      }
      
      // Save WordPress
      if (connectorData.wordpress?.baseUrl && connectorData.wordpress?.user && connectorData.wordpress?.appPassword) {
        const response = await fetch('/api/setup/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: `wp_${siteData.key}`,
            data: connectorData.wordpress
          }),
        })
        
        if (response.ok) savedSecrets.push('WordPress')
      }
      
      // Save API token
      if (connectorData.apiToken) {
        const response = await fetch('/api/setup/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'console_api_token',
            data: { token: connectorData.apiToken }
          }),
        })
        
        if (response.ok) savedSecrets.push('API Token')
      }
      
      setSecrets(savedSecrets)
      toast.success(`Saved ${savedSecrets.length} secrets`)
      setCurrentTab('github')
    } catch (error) {
      toast.error('Failed to save secrets')
    } finally {
      setLoading(false)
    }
  }

  const handleWriteToGitHub = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/setup/github-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) throw new Error('Failed to write to GitHub')
      
      const result = await response.json()
      setGithubResult(result)
      toast.success(`Wrote ${result.written} secrets to GitHub`)
    } catch (error) {
      toast.error('Failed to write secrets to GitHub')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Setup Wizard</h1>
          <p className="text-gray-600 mt-2">Configure your Orion Content system</p>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="site">Site Setup</TabsTrigger>
            <TabsTrigger value="connectors">Connectors</TabsTrigger>
            <TabsTrigger value="github">GitHub Secrets</TabsTrigger>
          </TabsList>

          <TabsContent value="site" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Your First Site</CardTitle>
                <CardDescription>
                  Set up your primary content site configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteKey">Site Key</Label>
                    <Input
                      id="siteKey"
                      placeholder="e.g., main"
                      value={siteData.key}
                      onChange={(e) => setSiteData(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      placeholder="e.g., My Content Site"
                      value={siteData.name}
                      onChange={(e) => setSiteData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={siteData.timezone}
                      onChange={(e) => setSiteData(prev => ({ ...prev, timezone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={siteData.publisher}
                      onChange={(e) => setSiteData(prev => ({ ...prev, publisher: e.target.value }))}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateSite} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Site'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connectors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configure Connectors</CardTitle>
                <CardDescription>
                  Set up your API keys and connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="openaiKey">OpenAI API Key</Label>
                  <Input
                    id="openaiKey"
                    type="password"
                    placeholder="sk-..."
                    value={connectorData.openai?.apiKey || ''}
                    onChange={(e) => setConnectorData(prev => ({ 
                      ...prev, 
                      openai: { apiKey: e.target.value } 
                    }))}
                  />
                </div>

                <div>
                  <Label>Search Provider</Label>
                  <RadioGroup
                    value={connectorData.searchProvider}
                    onValueChange={(value: 'CSE' | 'BING') => 
                      setConnectorData(prev => ({ ...prev, searchProvider: value }))
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CSE" id="cse" />
                      <Label htmlFor="cse">Google Custom Search Engine</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BING" id="bing" />
                      <Label htmlFor="bing">Bing Web Search</Label>
                    </div>
                  </RadioGroup>
                </div>

                {connectorData.searchProvider === 'CSE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cseId">CSE ID</Label>
                      <Input
                        id="cseId"
                        placeholder="Custom Search Engine ID"
                        value={connectorData.searchCse?.id || ''}
                        onChange={(e) => setConnectorData(prev => ({ 
                          ...prev, 
                          searchCse: { ...prev.searchCse, id: e.target.value, key: prev.searchCse?.key || '' } 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cseKey">CSE API Key</Label>
                      <Input
                        id="cseKey"
                        type="password"
                        placeholder="API Key"
                        value={connectorData.searchCse?.key || ''}
                        onChange={(e) => setConnectorData(prev => ({ 
                          ...prev, 
                          searchCse: { ...prev.searchCse, key: e.target.value, id: prev.searchCse?.id || '' } 
                        }))}
                      />
                    </div>
                  </div>
                )}

                {connectorData.searchProvider === 'BING' && (
                  <div>
                    <Label htmlFor="bingKey">Bing Search Key</Label>
                    <Input
                      id="bingKey"
                      type="password"
                      placeholder="Bing Web Search API Key"
                      value={connectorData.searchBing?.key || ''}
                      onChange={(e) => setConnectorData(prev => ({ 
                        ...prev, 
                        searchBing: { key: e.target.value } 
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">WordPress Connection</h3>
                  <div>
                    <Label htmlFor="wpBaseUrl">WordPress Base URL</Label>
                    <Input
                      id="wpBaseUrl"
                      placeholder="https://yoursite.com"
                      value={connectorData.wordpress?.baseUrl || ''}
                      onChange={(e) => setConnectorData(prev => ({ 
                        ...prev, 
                        wordpress: { 
                          ...prev.wordpress, 
                          baseUrl: e.target.value,
                          user: prev.wordpress?.user || '',
                          appPassword: prev.wordpress?.appPassword || ''
                        } 
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wpUser">Username</Label>
                      <Input
                        id="wpUser"
                        placeholder="WordPress username"
                        value={connectorData.wordpress?.user || ''}
                        onChange={(e) => setConnectorData(prev => ({ 
                          ...prev, 
                          wordpress: { 
                            ...prev.wordpress, 
                            user: e.target.value,
                            baseUrl: prev.wordpress?.baseUrl || '',
                            appPassword: prev.wordpress?.appPassword || ''
                          } 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wpPassword">App Password</Label>
                      <Input
                        id="wpPassword"
                        type="password"
                        placeholder="WordPress App Password"
                        value={connectorData.wordpress?.appPassword || ''}
                        onChange={(e) => setConnectorData(prev => ({ 
                          ...prev, 
                          wordpress: { 
                            ...prev.wordpress, 
                            appPassword: e.target.value,
                            baseUrl: prev.wordpress?.baseUrl || '',
                            user: prev.wordpress?.user || ''
                          } 
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Console API Token</h3>
                      <p className="text-sm text-gray-600">Generate a token for pipeline access</p>
                    </div>
                    <Button onClick={handleGenerateApiToken} variant="outline">
                      Generate Token
                    </Button>
                  </div>
                  {connectorData.apiToken && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <code className="text-sm font-mono">{connectorData.apiToken}</code>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveSecrets} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Secrets (Encrypted)'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="github" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>GitHub Secrets</CardTitle>
                <CardDescription>
                  Write your secrets to GitHub Actions for pipeline access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {secrets.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Saved Secrets:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {secrets.map((secret) => (
                        <li key={secret} className="text-sm text-gray-600">{secret}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleWriteToGitHub} disabled={loading || secrets.length === 0}>
                  {loading ? 'Writing...' : 'Write to GitHub Secrets'}
                </Button>

                {githubResult && (
                  <div className="mt-4 p-4 bg-green-50 rounded-md">
                    <h3 className="font-medium text-green-800">Successfully wrote {githubResult.written} secrets:</h3>
                    <ul className="mt-2 list-disc list-inside text-sm text-green-700">
                      {githubResult.names.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

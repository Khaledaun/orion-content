
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ArrowRight, Rocket, Zap, Users, BarChart } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CompletionStepProps {
  onComplete: (stepId: string, data?: any) => void
  loading: boolean
  status: any
}

export function CompletionStep({ onComplete, loading, status }: CompletionStepProps) {
  const router = useRouter()

  const features = [
    {
      icon: Rocket,
      title: 'Content Pipeline',
      description: 'Create topics, draft content, and publish seamlessly'
    },
    {
      icon: Zap,
      title: 'Quality Assurance',
      description: 'Automated QA validation with SEO best practices'
    },
    {
      icon: Users,
      title: 'Editorial Workflow',
      description: 'Review queue with approval and publishing controls'
    },
    {
      icon: BarChart,
      title: 'Analytics & Insights',
      description: 'Track performance with integrated GSC and GA4 data'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center py-8">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          You're all set!
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Your integrations are configured and ready to go. 
          Let's explore what you can do with Orion CMS.
        </p>
      </div>

      {/* Completed Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Integrations</CardTitle>
          <CardDescription>
            These integrations are ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-blue-900">WordPress</p>
                <p className="text-xs text-blue-700">Content publishing</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Search Console</p>
                <p className="text-xs text-green-700">SEO analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-purple-900">Analytics 4</p>
                <p className="text-xs text-purple-700">Visitor insights</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card>
        <CardHeader>
          <CardTitle>What you can do now</CardTitle>
          <CardDescription>
            Explore these powerful features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          onClick={() => router.push('/dashboard')}
          className="flex-1 sm:flex-none"
          size="lg"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/sites')}
          className="flex-1 sm:flex-none"
          size="lg"
        >
          Create Your First Site
        </Button>
      </div>
    </div>
  )
}

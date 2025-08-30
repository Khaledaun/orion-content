
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WordPressStep } from './steps/wordpress-step'
import { GSCStep } from './steps/gsc-step'
import { GA4Step } from './steps/ga4-step'
import { CompletionStep } from './steps/completion-step'

interface OnboardingStatus {
  id: string
  steps: {
    wordpress: boolean
    gsc: boolean
    ga4: boolean
  }
  progress: {
    completed: number
    total: number
    percentage: number
  }
  isCompleted: boolean
  completedAt?: string
}

const STEPS = [
  {
    id: 'wordpress',
    title: 'WordPress Connection',
    description: 'Connect your WordPress site for content publishing',
    component: WordPressStep
  },
  {
    id: 'gsc',
    title: 'Google Search Console',
    description: 'Connect GSC for SEO performance tracking',
    component: GSCStep
  },
  {
    id: 'ga4',
    title: 'Google Analytics 4',
    description: 'Connect GA4 for detailed analytics insights',
    component: GA4Step
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Your onboarding is complete',
    component: CompletionStep
  }
]

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [stepLoading, setStepLoading] = useState(false)

  // Load onboarding status
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/onboarding')
      if (!response.ok) {
        throw new Error('Failed to load onboarding status')
      }
      
      const data = await response.json()
      setStatus(data)
      
      // Set current step based on progress
      if (data.isCompleted) {
        setCurrentStep(STEPS.length - 1) // Show completion step
      } else {
        // Find first incomplete step
        let nextStep = 0
        if (data.steps.wordpress) nextStep = 1
        if (data.steps.gsc) nextStep = 2
        if (data.steps.ga4) nextStep = 3
        setCurrentStep(nextStep)
      }
    } catch (error) {
      console.error('Failed to load onboarding status:', error)
      toast.error('Failed to load onboarding status')
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = async (stepId: string, data?: any) => {
    setStepLoading(true)
    
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepId,
          ...data
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete step')
      }
      
      const updatedStatus = await response.json()
      setStatus(updatedStatus)
      
      toast.success(`${STEPS[currentStep].title} completed!`)
      
      // Move to next step or completion
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      }
      
      // If all done, redirect to dashboard after a delay
      if (updatedStatus.isCompleted) {
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
      
    } catch (error) {
      console.error('Failed to complete step:', error)
      toast.error('Failed to complete step')
    } finally {
      setStepLoading(false)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipToEnd = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading onboarding...</span>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load onboarding status. Please try refreshing the page.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const currentStepConfig = STEPS[currentStep]
  const CurrentStepComponent = currentStepConfig.component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome to Orion CMS
              </h1>
              <p className="text-sm text-gray-500">
                Let's get your integrations set up
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleSkipToEnd}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Setup Progress
            </h2>
            <Badge variant="secondary">
              {status.progress.completed} of {status.progress.total} completed
            </Badge>
          </div>
          
          <Progress value={status.progress.percentage} className="mb-6" />
          
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {STEPS.slice(0, -1).map((step, index) => {
              const isCompleted = status.steps[step.id as keyof typeof status.steps]
              const isCurrent = index === currentStep
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-2 ${
                    isCurrent ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Circle className={`h-6 w-6 ${isCurrent ? 'fill-current' : ''}`} />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">
                      {step.title}
                    </span>
                  </div>
                  
                  {index < STEPS.length - 2 && (
                    <ArrowRight className="h-4 w-4 text-gray-300 mx-4" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === STEPS.length - 1 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {currentStep + 1}
              </div>
              <div>
                <CardTitle>{currentStepConfig.title}</CardTitle>
                <CardDescription>{currentStepConfig.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <CurrentStepComponent
              onComplete={handleStepComplete}
              loading={stepLoading}
              status={status}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 0 || stepLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {currentStep === STEPS.length - 1 && (
                <Button onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

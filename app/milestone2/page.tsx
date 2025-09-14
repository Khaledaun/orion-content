"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket, 
  Target, 
  Lightbulb, 
  Activity,
  Sparkles,
  Award,
  Users,
  TrendingUp
} from 'lucide-react';

import { ContentFocusChart } from '@/components/milestone2/ContentFocusChart';
import { TopicWorkflow } from '@/components/milestone2/TopicWorkflow';
import { OnboardingWizard } from '@/components/milestone2/OnboardingWizard';
import { ProgressDashboard } from '@/components/milestone2/ProgressDashboard';

export default function Milestone2Page() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('focus-chart');

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveTab('focus-chart');
  };

  if (showOnboarding) {
    return (
      <div className="container mx-auto py-8">
        <OnboardingWizard 
          onComplete={handleOnboardingComplete}
          userTier="pro"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Phase 4-Pro: Ultra-Friendly Experience
          </h1>
        </div>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Welcome to the most delightful content management experience ever created! 
          Packed with perks, rewards, and intelligent automation to make your content journey effortless. ✨
        </p>
        
        <div className="flex items-center justify-center gap-4 mt-6">
          <Badge variant="secondary" className="bg-green-100 text-green-800 px-4 py-2">
            <Award className="h-4 w-4 mr-2" />
            Pro Features Unlocked
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-4 py-2">
            <Users className="h-4 w-4 mr-2" />
            Ultra-Friendly UI
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Perk-Rich Experience
          </Badge>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button 
            onClick={() => setShowOnboarding(true)}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            size="lg"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Start Onboarding Tour
          </Button>
          <Button variant="outline" size="lg">
            <Activity className="h-5 w-5 mr-2" />
            View Demo
          </Button>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('focus-chart')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Content Focus Chart</h3>
            <p className="text-sm text-gray-600">
              Interactive niche mapping with drag-and-drop and gamified progress tracking
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('topic-workflow')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Topic Workflow</h3>
            <p className="text-sm text-gray-600">
              AI-powered 30-topic generation with playful A/B testing and smart suggestions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('progress-dashboard')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Progress Dashboard</h3>
            <p className="text-sm text-gray-600">
              Beautiful metrics with achievement badges and automated email reporting
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowOnboarding(true)}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Onboarding Wizard</h3>
            <p className="text-sm text-gray-600">
              Two-phase SEO audit with friendly setup wizard and interactive guides
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="focus-chart" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Content Focus
          </TabsTrigger>
          <TabsTrigger value="topic-workflow" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Topic Generation
          </TabsTrigger>
          <TabsTrigger value="progress-dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Progress & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="focus-chart" className="space-y-6">
          <ContentFocusChart />
        </TabsContent>

        <TabsContent value="topic-workflow" className="space-y-6">
          <TopicWorkflow maxTopics={30} />
        </TabsContent>

        <TabsContent value="progress-dashboard" className="space-y-6">
          <ProgressDashboard userTier="pro" />
        </TabsContent>
      </Tabs>

      {/* Coming Soon Features */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Sparkles className="h-5 w-5" />
            Coming Soon Features
          </CardTitle>
          <CardDescription>
            More exciting features are on the way! 🚀
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">🔗 Backlink Opportunities</h4>
              <p className="text-sm text-gray-600">
                AI-powered backlink discovery and outreach automation
              </p>
              <Badge variant="outline" className="mt-2">To be determined</Badge>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">💰 Affiliate Networks</h4>
              <p className="text-sm text-gray-600">
                Seamless integration with major affiliate programs
              </p>
              <Badge variant="outline" className="mt-2">Coming Soon</Badge>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">📱 Social Embeds</h4>
              <p className="text-sm text-gray-600">
                Live social media updates with custom styling
              </p>
              <Badge className="bg-green-100 text-green-800 mt-2">In Development</Badge>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">🤖 AI Prompt Engineer</h4>
              <p className="text-sm text-gray-600">
                User-editable prompts with smart suggestions
              </p>
              <Badge className="bg-blue-100 text-blue-800 mt-2">Beta Testing</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
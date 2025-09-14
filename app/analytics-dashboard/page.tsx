
'use client';

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Eye, Brain } from 'lucide-react';

export default function AnalyticsDashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your content performance with real-time analytics and AI-powered insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Real-time Tracking</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor page views, user engagement, and content performance in real-time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Performance Insights</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Get detailed insights into what content performs best and why.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">AI Predictions</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered predictions and recommendations for content optimization.
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Analytics Integration:</strong> Connect your Google Analytics, Search Console, and social media accounts 
          for comprehensive performance tracking and insights.
        </AlertDescription>
      </Alert>

      <AnalyticsDashboard />
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  MousePointer, 
  Share2,
  MessageSquare,
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { AnalyticsMetric, ContentPerformance } from '@/lib/ai/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [metricsResponse, performanceResponse] = await Promise.all([
        fetch(`/api/analytics/metrics?period=${selectedPeriod}`),
        fetch(`/api/analytics/content-performance?period=${selectedPeriod}`)
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics || []);
      }

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setContentPerformance(performanceData.content || []);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/analytics/export?period=${selectedPeriod}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${selectedPeriod}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  // Mock data for demonstration
  const mockMetrics: AnalyticsMetric[] = [
    {
      id: 'page_views',
      name: 'Page Views',
      value: 12543,
      change: 15.3,
      changeType: 'increase',
      period: selectedPeriod,
    },
    {
      id: 'unique_visitors',
      name: 'Unique Visitors',
      value: 8921,
      change: 8.7,
      changeType: 'increase',
      period: selectedPeriod,
    },
    {
      id: 'bounce_rate',
      name: 'Bounce Rate',
      value: 42.1,
      change: -5.2,
      changeType: 'decrease',
      period: selectedPeriod,
    },
    {
      id: 'avg_session',
      name: 'Avg. Session Duration',
      value: 245,
      change: 12.4,
      changeType: 'increase',
      period: selectedPeriod,
    },
  ];

  const mockContentPerformance: ContentPerformance[] = [
    {
      contentId: '1',
      title: 'Getting Started with AI Content Generation',
      views: 2543,
      engagement: 78.5,
      shares: 156,
      comments: 23,
      conversionRate: 4.2,
      publishedAt: new Date('2024-01-15'),
      lastUpdated: new Date('2024-01-20'),
    },
    {
      contentId: '2',
      title: 'Advanced SEO Techniques for 2024',
      views: 1876,
      engagement: 82.1,
      shares: 203,
      comments: 45,
      conversionRate: 6.1,
      publishedAt: new Date('2024-01-10'),
      lastUpdated: new Date('2024-01-18'),
    },
    {
      contentId: '3',
      title: 'Content Marketing Automation Guide',
      views: 1432,
      engagement: 71.3,
      shares: 89,
      comments: 12,
      conversionRate: 3.8,
      publishedAt: new Date('2024-01-08'),
      lastUpdated: new Date('2024-01-15'),
    },
  ];

  const displayMetrics = metrics.length > 0 ? metrics : mockMetrics;
  const displayContent = contentPerformance.length > 0 ? contentPerformance : mockContentPerformance;

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Page Views',
        data: [1200, 1900, 3000, 5000, 2000, 3000, 4500],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Unique Visitors',
        data: [800, 1200, 2000, 3200, 1400, 2100, 3000],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const engagementData = {
    labels: ['Views', 'Shares', 'Comments', 'Conversions'],
    datasets: [
      {
        data: [65, 20, 10, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your content performance and user engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalyticsData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metric.id === 'avg_session' 
                        ? `${Math.floor(metric.value / 60)}:${(metric.value % 60).toString().padStart(2, '0')}`
                        : metric.value.toLocaleString()
                      }
                    </p>
                    <Badge
                      variant={metric.changeType === 'increase' ? 'default' : 'secondary'}
                      className={
                        metric.changeType === 'increase'
                          ? 'bg-green-100 text-green-800'
                          : metric.changeType === 'decrease'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : metric.changeType === 'decrease' ? (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      ) : null}
                      {Math.abs(metric.change)}%
                    </Badge>
                  </div>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  {metric.id === 'page_views' && <Eye className="w-5 h-5 text-blue-600" />}
                  {metric.id === 'unique_visitors' && <Users className="w-5 h-5 text-blue-600" />}
                  {metric.id === 'bounce_rate' && <MousePointer className="w-5 h-5 text-blue-600" />}
                  {metric.id === 'avg_session' && <Calendar className="w-5 h-5 text-blue-600" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Overview</CardTitle>
                <CardDescription>Page views and unique visitors over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Line data={chartData} options={chartOptions} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
                <CardDescription>How users interact with your content</CardDescription>
              </CardHeader>
              <CardContent>
                <Doughnut data={engagementData} options={doughnutOptions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Your best content ranked by performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayContent.map((content, index) => (
                  <div key={content.contentId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <h3 className="font-semibold">{content.title}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {content.views.toLocaleString()} views
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          {content.shares} shares
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {content.comments} comments
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {content.engagement}% engagement
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {content.conversionRate}% conversion
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Published {content.publishedAt.toLocaleDateString()}
                      </div>
                      <Progress value={content.engagement} className="w-20 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Behavior</CardTitle>
                <CardDescription>How users interact with your content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Time on Page</span>
                    <span className="text-sm text-muted-foreground">3:24</span>
                  </div>
                  <Progress value={68} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pages per Session</span>
                    <span className="text-sm text-muted-foreground">2.4</span>
                  </div>
                  <Progress value={48} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Return Visitor Rate</span>
                    <span className="text-sm text-muted-foreground">34%</span>
                  </div>
                  <Progress value={34} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Engagement</CardTitle>
                <CardDescription>Engagement metrics across content types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Blog Posts</span>
                    <span className="text-sm text-muted-foreground">78% engagement</span>
                  </div>
                  <Progress value={78} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Social Media</span>
                    <span className="text-sm text-muted-foreground">65% engagement</span>
                  </div>
                  <Progress value={65} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Campaigns</span>
                    <span className="text-sm text-muted-foreground">42% engagement</span>
                  </div>
                  <Progress value={42} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              AI-powered predictions are based on historical data and current trends. 
              Predictions become more accurate with more data over time.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Predictions</CardTitle>
                <CardDescription>Expected performance for the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Traffic Growth</p>
                      <p className="text-sm text-green-600">Expected increase in page views</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-800">+23%</p>
                      <p className="text-xs text-green-600">High confidence</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Engagement Rate</p>
                      <p className="text-sm text-blue-600">Predicted user engagement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-800">+12%</p>
                      <p className="text-xs text-blue-600">Medium confidence</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-800">Conversion Rate</p>
                      <p className="text-sm text-orange-600">Expected conversion improvement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-800">+8%</p>
                      <p className="text-xs text-orange-600">Low confidence</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Recommendations</CardTitle>
                <CardDescription>AI-suggested improvements for better performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Optimize for Mobile</p>
                    <p className="text-xs text-muted-foreground">
                      67% of your traffic is mobile. Consider mobile-first design.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Improve Loading Speed</p>
                    <p className="text-xs text-muted-foreground">
                      Pages loading under 3s have 40% better engagement.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Add More CTAs</p>
                    <p className="text-xs text-muted-foreground">
                      Content with clear CTAs converts 25% better.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Update Old Content</p>
                    <p className="text-xs text-muted-foreground">
                      Refreshing content older than 6 months boosts SEO.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner, LoadingCard } from "@/components/ui/loading-spinner";
import { EnhancedErrorBoundary } from "@/components/ui/enhanced-error-boundary";
import {
  ResponsiveContainer,
  ResponsiveGrid,
} from "@/components/ui/responsive-container";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Users,
  Globe,
  RefreshCw,
  Calendar,
  Target,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalSites: number;
    totalViews: number;
    totalUsers: number;
    conversionRate: number;
  };
  traffic: {
    date: string;
    views: number;
    users: number;
  }[];
  topPages: {
    path: string;
    views: number;
    bounceRate: number;
  }[];
  performance: {
    avgLoadTime: number;
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
    };
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call - replace with actual analytics API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData: AnalyticsData = {
        overview: {
          totalSites: 12,
          totalViews: 45678,
          totalUsers: 12345,
          conversionRate: 3.2,
        },
        traffic: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          views: Math.floor(Math.random() * 1000) + 500,
          users: Math.floor(Math.random() * 500) + 200,
        })),
        topPages: [
          { path: "/home", views: 12345, bounceRate: 0.32 },
          { path: "/products", views: 8901, bounceRate: 0.28 },
          { path: "/about", views: 5678, bounceRate: 0.45 },
          { path: "/contact", views: 3456, bounceRate: 0.52 },
          { path: "/blog", views: 2345, bounceRate: 0.38 },
        ],
        performance: {
          avgLoadTime: 1.2,
          coreWebVitals: {
            lcp: 2.1,
            fid: 0.08,
            cls: 0.05,
          },
        },
      };

      setData(mockData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <ResponsiveContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 4 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </ResponsiveGrid>
          <LoadingCard />
        </div>
      </ResponsiveContainer>
    );
  }

  if (error) {
    return (
      <ResponsiveContainer>
        <EnhancedErrorBoundary>
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Try Again</Button>
          </div>
        </EnhancedErrorBoundary>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track your content performance and user engagement
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <Button
              onClick={fetchAnalytics}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.overview.totalSites}
              </div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.overview.totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.overview.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +8.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.overview.conversionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                +0.3% from last month
              </p>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        {/* Detailed Analytics */}
        <Tabs defaultValue="traffic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="pages">Top Pages</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Overview</CardTitle>
                <CardDescription>
                  Daily views and users for the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Traffic chart would be rendered here</p>
                    <p className="text-sm">
                      Integration with Chart.js or Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Pages</CardTitle>
                <CardDescription>
                  Pages with the highest traffic and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.topPages.map((page, index) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{page.path}</p>
                          <p className="text-sm text-gray-500">
                            {page.views.toLocaleString()} views
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {(page.bounceRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Bounce Rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <ResponsiveGrid cols={{ sm: 1, md: 2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Load Performance</CardTitle>
                  <CardDescription>Average page load times</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {data?.performance.avgLoadTime}s
                  </div>
                  <p className="text-sm text-green-600">
                    ↓ 0.2s faster than last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Core Web Vitals</CardTitle>
                  <CardDescription>Key performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      LCP (Largest Contentful Paint)
                    </span>
                    <span className="font-medium">
                      {data?.performance.coreWebVitals.lcp}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">FID (First Input Delay)</span>
                    <span className="font-medium">
                      {data?.performance.coreWebVitals.fid}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      CLS (Cumulative Layout Shift)
                    </span>
                    <span className="font-medium">
                      {data?.performance.coreWebVitals.cls}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  );
}

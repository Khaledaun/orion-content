"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Globe,
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  BarChart3,
  Users,
  FileText,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useDictionary, useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/enhanced-states";
import { SkipLink, useFocusManagement } from "@/components/ui/accessibility";

interface DashboardData {
  siteCount: number;
  weekCount: number;
  topicCount: number;
  jobRunCount: number;
  metrics?: {
    throughput: number;
    qaPassRate: number;
    avgLatency: number;
    costPerMonth: number;
  };
}

interface DashboardClientProps {
  initialData: DashboardData;
  userName?: string;
}

export function DashboardClient({
  initialData,
  userName = "Admin",
}: DashboardClientProps) {
  const dict = useDictionary();
  const { isRTL } = useLanguage();
  const { _focusMainContent } = useFocusManagement();

  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate enhanced metrics loading
  useEffect(() => {
    const loadEnhancedMetrics = async () => {
      if (data.metrics) return; // Already loaded

      setLoading(true);
      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Simulate metrics data
        const enhancedMetrics = {
          throughput: Math.floor(Math.random() * 1000) + 500, // 500-1500 articles/month
          qaPassRate: Math.floor(Math.random() * 15) + 85, // 85-100%
          avgLatency: Math.floor(Math.random() * 500) + 100, // 100-600ms
          costPerMonth: Math.floor(Math.random() * 200) + 50, // $50-250/month
        };

        setData((prev) => ({ ...prev, metrics: enhancedMetrics }));
      } catch (err) {
        setError("Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedMetrics();
  }, [data.metrics]);

  const getPassRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  const formatLatency = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <SkipLink href="#main-content">{dict.accessibility.skipToMain}</SkipLink>

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              {dict.dashboard.title}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {userName}</span>
              <LanguageSwitcher showText />
              <Button asChild variant="outline">
                <Link href="/api/auth/signout">{dict.auth.signOut}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"
        role="main"
        tabIndex={-1}
      >
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dict.dashboard.activeSites}
                </CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {data.siteCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.siteCount > 0
                    ? "+2 from last month"
                    : "Create your first site"}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dict.dashboard.pendingWeeks}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.weekCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.weekCount > 0 ? "Awaiting review" : "All caught up!"}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dict.dashboard.totalTopics}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {data.topicCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{Math.floor(data.topicCount * 0.15)} this week
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Job Runs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {data.jobRunCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.jobRunCount > 0
                    ? "Last run: 2 hours ago"
                    : "No jobs yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {dict.dashboard.quickStats}
                </CardTitle>
                <CardDescription>
                  Key performance indicators for your content operation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState message={dict.dashboard.loadingMetrics} />
                ) : error ? (
                  <ErrorState
                    message={dict.dashboard.errorLoadingData}
                    onRetry={() => window.location.reload()}
                  />
                ) : data.metrics ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {dict.dashboard.throughput}
                        </span>
                      </div>
                      <div className="text-lg font-bold">
                        {data.metrics.throughput.toLocaleString()}/mo
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {dict.dashboard.qaPassRate}
                        </span>
                      </div>
                      <div
                        className={`text-lg font-bold ${getPassRateColor(data.metrics.qaPassRate)}`}
                      >
                        {data.metrics.qaPassRate}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">
                          {dict.dashboard.avgLatency}
                        </span>
                      </div>
                      <div className="text-lg font-bold">
                        {formatLatency(data.metrics.avgLatency)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">
                          {dict.dashboard.costPerMonth}
                        </span>
                      </div>
                      <div className="text-lg font-bold">
                        ${data.metrics.costPerMonth}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title={dict.dashboard.noDataAvailable}
                    description="Metrics will appear here once your system starts processing content"
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and navigation shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Link href="/sites" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Globe className="mr-2 h-4 w-4" />
                      {dict.dashboard.manageSites}
                    </Button>
                  </Link>

                  <Link href="/weeks" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dict.dashboard.viewWeeks}
                    </Button>
                  </Link>

                  <Link href="/credentials" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Credentials
                    </Button>
                  </Link>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    {dict.dashboard.monitorJobs}
                    <Badge variant="secondary" className="ml-auto">
                      Coming Soon
                    </Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current status of your Orion CMS installation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Content Pipeline</p>
                    <p className="text-xs text-muted-foreground">
                      Processing queue
                    </p>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Healthy
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">API Connections</p>
                    <p className="text-xs text-muted-foreground">
                      External services
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    Partial
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Storage</p>
                    <p className="text-xs text-muted-foreground">
                      Database & files
                    </p>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Operational
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Users,
  Search,
  Award,
  Target,
  Mail,
  Download,
  Trophy,
  Star,
  Flame,
  Crown,
  ChevronUp,
  ChevronDown,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
} from "lucide-react";

interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "stable";
  target?: number;
  unit?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: Date;
}

interface ProgressDashboardProps {
  userTier?: "starter" | "pro" | "guru";
}

export function ProgressDashboard({
  userTier = "pro",
}: ProgressDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">(
    "30d",
  );
  const [showAchievements, setShowAchievements] = useState(false);

  const metrics: MetricData[] = [
    {
      label: "Total Page Views",
      value: 45678,
      change: 12.5,
      trend: "up",
      target: 50000,
      unit: "views",
    },
    {
      label: "Organic Traffic",
      value: 23456,
      change: 8.3,
      trend: "up",
      target: 30000,
      unit: "visits",
    },
    {
      label: "Content Pieces",
      value: 127,
      change: 15.2,
      trend: "up",
      target: 150,
      unit: "articles",
    },
    {
      label: "Avg. Engagement",
      value: 4.2,
      change: -2.1,
      trend: "down",
      target: 5.0,
      unit: "minutes",
    },
    {
      label: "SEO Score",
      value: 87,
      change: 5.8,
      trend: "up",
      target: 95,
      unit: "%",
    },
    {
      label: "Conversion Rate",
      value: 3.4,
      change: 0.8,
      trend: "up",
      target: 4.0,
      unit: "%",
    },
  ];

  const achievements: Achievement[] = [
    {
      id: "first-post",
      title: "First Steps",
      description: "Published your first article",
      icon: <Star className="h-5 w-5" />,
      unlocked: true,
      rarity: "common",
      unlockedAt: new Date("2024-01-10"),
    },
    {
      id: "traffic-milestone",
      title: "Traffic Magnet",
      description: "Reached 10,000 monthly visitors",
      icon: <TrendingUp className="h-5 w-5" />,
      unlocked: true,
      rarity: "rare",
      unlockedAt: new Date("2024-01-15"),
    },
    {
      id: "seo-master",
      title: "SEO Master",
      description: "Achieved 90+ SEO score",
      icon: <Crown className="h-5 w-5" />,
      unlocked: false,
      progress: 87,
      maxProgress: 90,
      rarity: "epic",
    },
    {
      id: "content-creator",
      title: "Content Creator",
      description: "Published 100 articles",
      icon: <Award className="h-5 w-5" />,
      unlocked: true,
      rarity: "rare",
      unlockedAt: new Date("2024-01-20"),
    },
    {
      id: "viral-content",
      title: "Viral Sensation",
      description: "Get 50,000 views on a single article",
      icon: <Flame className="h-5 w-5" />,
      unlocked: false,
      progress: 23456,
      maxProgress: 50000,
      rarity: "legendary",
    },
    {
      id: "engagement-guru",
      title: "Engagement Guru",
      description: "Maintain 5+ minute average engagement",
      icon: <Trophy className="h-5 w-5" />,
      unlocked: false,
      progress: 4.2,
      maxProgress: 5.0,
      rarity: "epic",
    },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "rare":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "epic":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "legendary":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === "up") return <ChevronUp className="h-4 w-4 text-green-600" />;
    if (trend === "down")
      return <ChevronDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-600";
  };

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const totalAchievements = achievements.length;

  return (
    <div className="space-y-6">
      {/* Header with Gamified Elements */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            Progress Dashboard
            <Badge
              variant="secondary"
              className="ml-2 bg-purple-100 text-purple-800"
            >
              <Crown className="h-4 w-4 mr-1" />
              {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan
            </Badge>
          </h2>
          <p className="text-gray-600 mt-1">
            Track your content empire's growth with beautiful insights and
            achievement rewards! 🏆
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAchievements(!showAchievements)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Achievements ({unlockedAchievements.length}/{totalAchievements})
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Achievement Showcase */}
      {showAchievements && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Trophy className="h-5 w-5" />
              Achievement Gallery
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                {unlockedAchievements.length}/{totalAchievements} Unlocked
              </Badge>
            </CardTitle>
            <CardDescription>
              Celebrate your content creation milestones! 🎉
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${
                      achievement.unlocked
                        ? `${getRarityColor(achievement.rarity)} shadow-sm`
                        : "bg-gray-50 text-gray-400 border-gray-200 opacity-60"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                      p-2 rounded-full 
                      ${achievement.unlocked ? "bg-white" : "bg-gray-200"}
                    `}
                    >
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">
                        {achievement.title}
                      </h4>
                      <p className="text-xs opacity-80 mb-2">
                        {achievement.description}
                      </p>

                      {achievement.unlocked ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {achievement.rarity}
                          </Badge>
                          {achievement.unlockedAt && (
                            <span className="opacity-60">
                              {achievement.unlockedAt.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : achievement.progress !== undefined &&
                        achievement.maxProgress !== undefined ? (
                        <div className="space-y-1">
                          <Progress
                            value={
                              (achievement.progress / achievement.maxProgress) *
                              100
                            }
                            className="h-2"
                          />
                          <p className="text-xs opacity-60">
                            {achievement.progress.toLocaleString()} /{" "}
                            {achievement.maxProgress.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 opacity-60"
                        >
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Selector */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(["7d", "30d", "90d"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all
                ${
                  selectedPeriod === period
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {period === "7d"
                ? "Last 7 days"
                : period === "30d"
                  ? "Last 30 days"
                  : "Last 90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card
            key={index}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">
                  {metric.label}
                </h3>
                <div
                  className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}
                >
                  {getTrendIcon(metric.trend, metric.change)}
                  <span className="text-sm font-medium">
                    {metric.change > 0 ? "+" : ""}
                    {metric.change}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {metric.value.toLocaleString()}
                  </span>
                  {metric.unit && (
                    <span className="text-sm text-gray-500">{metric.unit}</span>
                  )}
                </div>

                {metric.target && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Goal Progress</span>
                      <span className="font-medium">
                        {Math.round((metric.value / metric.target) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(metric.value / metric.target) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">
                      {(metric.target - metric.value).toLocaleString()}{" "}
                      {metric.unit} to goal
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Engagement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-600" />
                  Traffic Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">
                      Interactive chart would go here
                    </p>
                    <p className="text-sm text-gray-500">
                      Showing {selectedPeriod} traffic data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics
                    .filter((m) => m.target)
                    .map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {metric.label}
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round((metric.value / metric.target!) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(metric.value / metric.target!) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Content</CardTitle>
                <CardDescription>
                  Your best articles from the last {selectedPeriod}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Best Sustainable Phone Cases for 2024",
                      views: 12500,
                      engagement: "4.2 min",
                    },
                    {
                      title:
                        "Remote Work Productivity: 15 Tools That Actually Work",
                      views: 8900,
                      engagement: "3.8 min",
                    },
                    {
                      title: "MacBook Pro M3 vs M2: The Honest Comparison",
                      views: 7600,
                      engagement: "5.1 min",
                    },
                  ].map((article, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {article.views.toLocaleString()} views •{" "}
                          {article.engagement} avg. engagement
                        </p>
                      </div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      🎯 Top Tip
                    </h4>
                    <p className="text-sm text-blue-800">
                      Your tech review articles get 40% more engagement than
                      average!
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">
                      📈 Opportunity
                    </h4>
                    <p className="text-sm text-green-800">
                      Publishing on Tuesdays increases your reach by 25%.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">
                      ✨ Achievement
                    </h4>
                    <p className="text-sm text-purple-800">
                      You're close to unlocking "SEO Master" - just 3 more
                      points!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-600" />
                  SEO Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Overall SEO Score
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      87/100
                    </Badge>
                  </div>
                  <Progress value={87} className="h-3" />

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">156</p>
                      <p className="text-sm text-gray-600">Keywords Ranking</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">23</p>
                      <p className="text-sm text-gray-600">Top 10 Rankings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent SEO Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      keyword: "sustainable phone cases",
                      position: 3,
                      change: "+5",
                    },
                    {
                      keyword: "remote work tools 2024",
                      position: 7,
                      change: "+12",
                    },
                    {
                      keyword: "macbook pro comparison",
                      position: 2,
                      change: "+3",
                    },
                  ].map((win, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          "{win.keyword}"
                        </p>
                        <p className="text-sm text-gray-600">
                          Position #{win.position}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {win.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Audience Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                    <p className="text-gray-600">Engagement timeline chart</p>
                    <p className="text-sm text-gray-500">
                      Average session: 4.2 minutes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bounce Rate</span>
                    <span className="font-semibold text-green-600">32%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pages per Session</span>
                    <span className="font-semibold">2.8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Return Visitors</span>
                    <span className="font-semibold text-blue-600">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Social Shares</span>
                    <span className="font-semibold text-purple-600">1,234</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Reporting */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Mail className="h-5 w-5" />
            Automated Reporting
          </CardTitle>
          <CardDescription>
            Get beautiful progress reports delivered to your inbox
            automatically! 📧
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                📊 Weekly Summary
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Key metrics, top content, and achievement updates every Monday.
              </p>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                📈 Monthly Deep Dive
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Comprehensive analysis with actionable insights and
                recommendations.
              </p>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                🎯 Goal Alerts
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Instant notifications when you hit milestones or need attention.
              </p>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

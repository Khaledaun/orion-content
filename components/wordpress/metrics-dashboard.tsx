/**
 * WordPress Metrics Dashboard Component
 * Displays WordPress publishing metrics and analytics
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Target,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface WordPressMetricsDashboardProps {
  siteId?: string;
  showSiteSelector?: boolean;
}

interface GlobalMetrics {
  totalPublishes: number;
  successfulPublishes: number;
  failedPublishes: number;
  successRate: number;
  averagePublishTime: number;
  totalCost: number;
  costPerPublish: number;
  costPerSuccessfulPublish: number;
  wordpressApiCalls: number;
  wordpressApiErrors: number;
  rulebookBlocks: number;
  qualityScoreAverage: number;
}

interface SiteMetrics {
  siteId: string;
  siteUrl: string;
  totalPublishes: number;
  successfulPublishes: number;
  failedPublishes: number;
  successRate: number;
  averagePublishTime: number;
  totalCost: number;
  lastPublishAt: Date | null;
  connectionUptime: number;
  averageQualityScore: number;
}

interface TrendData {
  date: string;
  publishes: number;
  successfulPublishes: number;
  failedPublishes: number;
  totalCost: number;
  averageQualityScore: number;
}

export function WordPressMetricsDashboard({
  siteId,
  showSiteSelector = false,
}: WordPressMetricsDashboardProps) {
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [siteMetrics, setSiteMetrics] = useState<SiteMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState("30");
  const [selectedSite, setSelectedSite] = useState(siteId || "");

  useEffect(() => {
    loadMetrics();
  }, [selectedDays, selectedSite]);

  const loadMetrics = async () => {
    setIsLoading(true);
    
    try {
      const days = parseInt(selectedDays);
      
      // Load global metrics
      const globalResponse = await fetch(`/api/wordpress/metrics?type=global&days=${days}`);
      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        setGlobalMetrics(globalData);
      }

      // Load site metrics if site is selected
      if (selectedSite) {
        const siteResponse = await fetch(`/api/wordpress/metrics?type=site&siteId=${selectedSite}&days=${days}`);
        if (siteResponse.ok) {
          const siteData = await siteResponse.json();
          setSiteMetrics(siteData);
        }
      }

      // Load trends
      const trendsResponse = await fetch(`/api/wordpress/metrics?type=trends&days=${days}`);
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        setTrends(trendsData);
      }

    } catch (error) {
      console.error("Failed to load WordPress metrics:", error);
      toast.error("Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.9) return "text-green-600";
    if (rate >= 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading WordPress metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WordPress Publishing Metrics</h2>
          <p className="text-muted-foreground">
            Track publishing performance, costs, and quality metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={loadMetrics}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Global Metrics Cards */}
      {globalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Publishes</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalMetrics.totalPublishes}</div>
              <p className="text-xs text-muted-foreground">
                {globalMetrics.successfulPublishes} successful, {globalMetrics.failedPublishes} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSuccessRateColor(globalMetrics.successRate)}`}>
                {formatPercentage(globalMetrics.successRate)}
              </div>
              <p className="text-xs text-muted-foreground">
                {globalMetrics.rulebookBlocks} blocked by rulebook
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Publish Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(globalMetrics.averagePublishTime)}</div>
              <p className="text-xs text-muted-foreground">
                {globalMetrics.wordpressApiCalls} API calls made
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Publish</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalMetrics.costPerPublish)}</div>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(globalMetrics.totalCost)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Score */}
      {globalMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${getQualityScoreColor(globalMetrics.qualityScoreAverage)}`}>
                  {globalMetrics.qualityScoreAverage.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground">Average Quality Score</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Target: 80+</div>
                <Badge 
                  variant={globalMetrics.qualityScoreAverage >= 80 ? "default" : "destructive"}
                  className="mt-1"
                >
                  {globalMetrics.qualityScoreAverage >= 80 ? "Meeting Target" : "Below Target"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Publishing Trends Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Publishing Trends</CardTitle>
            <CardDescription>
              Daily publishing activity over the last {selectedDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    name === "totalCost" ? formatCurrency(Number(value)) : value,
                    name === "publishes" ? "Total Publishes" :
                    name === "successfulPublishes" ? "Successful" :
                    name === "failedPublishes" ? "Failed" :
                    name === "totalCost" ? "Cost" : name
                  ]}
                />
                <Bar dataKey="publishes" fill="#8884d8" name="Total Publishes" />
                <Bar dataKey="successfulPublishes" fill="#82ca9d" name="Successful" />
                <Bar dataKey="failedPublishes" fill="#ffc658" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cost Trends Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Trends</CardTitle>
            <CardDescription>
              Daily publishing costs over the last {selectedDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [formatCurrency(Number(value)), "Cost"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCost" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: "#8884d8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Site-Specific Metrics */}
      {siteMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Site-Specific Metrics</CardTitle>
            <CardDescription>
              Metrics for {siteMetrics.siteUrl}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">{siteMetrics.totalPublishes}</div>
                <p className="text-sm text-muted-foreground">Total Publishes</p>
              </div>
              <div>
                <div className={`text-2xl font-bold ${getSuccessRateColor(siteMetrics.successRate)}`}>
                  {formatPercentage(siteMetrics.successRate)}
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(siteMetrics.totalCost)}</div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
            </div>
            
            {siteMetrics.lastPublishAt && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Last publish: {new Date(siteMetrics.lastPublishAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

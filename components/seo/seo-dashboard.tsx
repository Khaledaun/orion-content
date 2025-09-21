/**
 * SEO Dashboard Component
 * Comprehensive SEO analysis and monitoring dashboard
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  Zap,
  Shield,
  Settings
} from 'lucide-react';

interface SEOScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  accessibility: number;
  wordpress: number;
}

interface SEOIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
  affectedPages: string[];
  score: number;
  status: 'open' | 'fixed' | 'ignored';
}

interface SEOAudit {
  id: string;
  siteUrl: string;
  auditDate: string;
  score: SEOScore;
  issues: SEOIssue[];
  recommendations: string[];
  wordpressInfo: {
    version: string;
    theme: string;
    plugins: string[];
    seoPlugins: string[];
  };
  summary: {
    totalPages: number;
    totalIssues: number;
    criticalIssues: number;
    averageLoadTime: number;
    mobileFriendly: boolean;
  };
}

interface SEODashboardProps {
  siteId: string;
  siteUrl: string;
}

export function SEODashboard({ siteId, siteUrl }: SEODashboardProps) {
  const [audits, setAudits] = useState<SEOAudit[]>([]);
  const [currentAudit, setCurrentAudit] = useState<SEOAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);

  useEffect(() => {
    loadAudits();
  }, [siteId]);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/seo/audit?siteId=${siteId}&limit=5`);
      const data = await response.json();
      
      if (data.audits) {
        setAudits(data.audits);
        if (data.audits.length > 0) {
          setCurrentAudit(data.audits[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load SEO audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const runNewAudit = async () => {
    try {
      setRunningAudit(true);
      const response = await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          siteUrl,
          options: {
            maxPages: 50,
            maxDepth: 3,
            includePerformance: true,
            includeAccessibility: true,
            includeWordPress: true,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload audits to show the new one
        await loadAudits();
      } else {
        console.error('Audit failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to run SEO audit:', error);
    } finally {
      setRunningAudit(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading SEO data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SEO Dashboard</h2>
          <p className="text-gray-600">Monitor and optimize your site's SEO performance</p>
        </div>
        <Button 
          onClick={runNewAudit} 
          disabled={runningAudit}
          className="flex items-center gap-2"
        >
          {runningAudit ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {runningAudit ? 'Running Audit...' : 'Run New Audit'}
        </Button>
      </div>

      {!currentAudit ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SEO Audits Found</h3>
            <p className="text-gray-600 mb-4">
              Run your first SEO audit to analyze your site's performance and identify optimization opportunities.
            </p>
            <Button onClick={runNewAudit} disabled={runningAudit}>
              {runningAudit ? 'Running Audit...' : 'Start SEO Audit'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${getScoreColor(currentAudit.score.overall)}`}>
                    {currentAudit.score.overall}
                  </div>
                  <Badge variant={getScoreBadgeVariant(currentAudit.score.overall)}>
                    {currentAudit.score.overall >= 80 ? 'Excellent' : 
                     currentAudit.score.overall >= 60 ? 'Good' : 'Needs Work'}
                  </Badge>
                </div>
                <Progress value={currentAudit.score.overall} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-red-600">
                    {currentAudit.summary.criticalIssues}
                  </div>
                  <Badge variant="destructive">High Priority</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {currentAudit.summary.totalIssues} total issues found
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div className="text-2xl font-bold">
                    {currentAudit.summary.averageLoadTime}ms
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {currentAudit.summary.averageLoadTime < 3000 ? 'Good' : 'Needs optimization'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Technical
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getScoreColor(currentAudit.score.technical)}`}>
                      {currentAudit.score.technical}
                    </div>
                    <Progress value={currentAudit.score.technical} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getScoreColor(currentAudit.score.content)}`}>
                      {currentAudit.score.content}
                    </div>
                    <Progress value={currentAudit.score.content} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getScoreColor(currentAudit.score.performance)}`}>
                      {currentAudit.score.performance}
                    </div>
                    <Progress value={currentAudit.score.performance} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Accessibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getScoreColor(currentAudit.score.accessibility)}`}>
                      {currentAudit.score.accessibility}
                    </div>
                    <Progress value={currentAudit.score.accessibility} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      WordPress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getScoreColor(currentAudit.score.wordpress)}`}>
                      {currentAudit.score.wordpress}
                    </div>
                    <Progress value={currentAudit.score.wordpress} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Site Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Site Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{currentAudit.summary.totalPages}</div>
                      <div className="text-sm text-gray-600">Pages Analyzed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{currentAudit.summary.totalIssues}</div>
                      <div className="text-sm text-gray-600">Total Issues</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{currentAudit.summary.criticalIssues}</div>
                      <div className="text-sm text-gray-600">Critical Issues</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {currentAudit.summary.mobileFriendly ? 'Yes' : 'No'}
                      </div>
                      <div className="text-sm text-gray-600">Mobile Friendly</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <div className="space-y-4">
                {currentAudit.issues.map((issue) => (
                  <Card key={issue.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{issue.title}</h4>
                            <Badge className={getImpactColor(issue.impact)}>
                              {issue.impact}
                            </Badge>
                            <Badge variant="outline">{issue.category}</Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{issue.description}</p>
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm font-medium text-blue-800 mb-1">How to fix:</p>
                            <p className="text-sm text-blue-700">{issue.fix}</p>
                          </div>
                          {issue.affectedPages.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700 mb-1">Affected pages:</p>
                              <div className="flex flex-wrap gap-1">
                                {issue.affectedPages.slice(0, 3).map((page, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {page}
                                  </Badge>
                                ))}
                                {issue.affectedPages.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{issue.affectedPages.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                {currentAudit.recommendations.map((recommendation, index) => (
                  <Alert key={index}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="wordpress" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>WordPress Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">Version:</span> {currentAudit.wordpressInfo.version}
                    </div>
                    <div>
                      <span className="font-medium">Theme:</span> {currentAudit.wordpressInfo.theme}
                    </div>
                    <div>
                      <span className="font-medium">Total Plugins:</span> {currentAudit.wordpressInfo.plugins.length}
                    </div>
                    <div>
                      <span className="font-medium">SEO Plugins:</span> {currentAudit.wordpressInfo.seoPlugins.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SEO Plugins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAudit.wordpressInfo.seoPlugins.length > 0 ? (
                      <div className="space-y-2">
                        {currentAudit.wordpressInfo.seoPlugins.map((plugin, index) => (
                          <Badge key={index} variant="default">
                            {plugin}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No SEO plugins detected</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

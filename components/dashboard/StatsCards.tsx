
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Users,
  Globe,
  BarChart3,
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalDrafts: number;
    pendingReviews: number;
    approvedToday: number;
    qualityScore: number;
    activeSites: number;
    totalUsers: number;
    systemHealth: number;
    trendsUp: boolean;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Drafts',
      value: stats.totalDrafts.toLocaleString(),
      icon: FileText,
      color: 'text-orion-navy',
      bgColor: 'bg-orion-background-light',
      change: stats.trendsUp ? '+12%' : '-3%',
      changeColor: stats.trendsUp ? 'text-orion-emerald' : 'text-orion-crimson',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews.toString(),
      icon: Clock,
      color: 'text-orion-amber',
      bgColor: 'bg-amber-50',
      badge: stats.pendingReviews > 10 ? 'High' : stats.pendingReviews > 5 ? 'Medium' : 'Low',
      badgeColor: stats.pendingReviews > 10 ? 'bg-orion-crimson' : stats.pendingReviews > 5 ? 'bg-orion-amber' : 'bg-orion-emerald',
    },
    {
      title: 'Approved Today',
      value: stats.approvedToday.toString(),
      icon: CheckCircle,
      color: 'text-orion-emerald',
      bgColor: 'bg-emerald-50',
      change: '+8%',
      changeColor: 'text-orion-emerald',
    },
    {
      title: 'Quality Score',
      value: `${(stats.qualityScore * 100).toFixed(0)}%`,
      icon: BarChart3,
      color: stats.qualityScore > 0.8 ? 'text-orion-emerald' : stats.qualityScore > 0.6 ? 'text-orion-amber' : 'text-orion-crimson',
      bgColor: stats.qualityScore > 0.8 ? 'bg-emerald-50' : stats.qualityScore > 0.6 ? 'bg-amber-50' : 'bg-red-50',
      subtitle: 'Average across all content',
    },
    {
      title: 'Active Sites',
      value: stats.activeSites.toString(),
      icon: Globe,
      color: 'text-orion-blue',
      bgColor: 'bg-blue-50',
      subtitle: 'Connected platforms',
    },
    {
      title: 'Team Members',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'text-orion-navy',
      bgColor: 'bg-orion-background-light',
      subtitle: 'Active reviewers',
    },
    {
      title: 'System Health',
      value: `${stats.systemHealth}%`,
      icon: stats.systemHealth > 95 ? CheckCircle : stats.systemHealth > 85 ? AlertTriangle : AlertTriangle,
      color: stats.systemHealth > 95 ? 'text-orion-emerald' : stats.systemHealth > 85 ? 'text-orion-amber' : 'text-orion-crimson',
      bgColor: stats.systemHealth > 95 ? 'bg-emerald-50' : stats.systemHealth > 85 ? 'bg-amber-50' : 'bg-red-50',
      badge: stats.systemHealth > 95 ? 'Excellent' : stats.systemHealth > 85 ? 'Good' : 'Issues',
      badgeColor: stats.systemHealth > 95 ? 'bg-orion-emerald' : stats.systemHealth > 85 ? 'bg-orion-amber' : 'bg-orion-crimson',
    },
    {
      title: 'Trends',
      value: stats.trendsUp ? '↗ Growing' : '↘ Declining',
      icon: TrendingUp,
      color: stats.trendsUp ? 'text-orion-emerald' : 'text-orion-crimson',
      bgColor: stats.trendsUp ? 'bg-emerald-50' : 'bg-red-50',
      subtitle: 'Content velocity',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title} className="border border-gray-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orion-navy mb-1">
                  {card.value}
                </div>
                {card.subtitle && (
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                )}
                {card.change && (
                  <div className={`text-xs font-medium ${card.changeColor} flex items-center gap-1 mt-1`}>
                    <TrendingUp className="h-3 w-3" />
                    {card.change} from last week
                  </div>
                )}
              </div>
              {card.badge && (
                <Badge className={`${card.badgeColor} text-white text-xs`}>
                  {card.badge}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

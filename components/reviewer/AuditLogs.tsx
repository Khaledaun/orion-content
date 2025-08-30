
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, User, Calendar, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  action: 'APPROVE' | 'REJECT' | 'BYPASS';
  reason?: string;
  createdAt: string;
  draft: {
    title: string;
    score?: number;
  };
}

interface AuditLogsProps {
  userRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export function AuditLogs({ userRole }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchAuditLogs();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const fetchAuditLogs = async () => {
    try {
      // This would be a real endpoint in production
      const mockLogs: AuditEntry[] = [
        {
          id: '1',
          action: 'APPROVE',
          reason: 'Content meets quality standards after review',
          createdAt: new Date().toISOString(),
          draft: {
            title: 'How to Optimize Your WordPress Site for SEO',
            score: 0.85,
          },
        },
        {
          id: '2', 
          action: 'REJECT',
          reason: 'Multiple grammar issues detected',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          draft: {
            title: 'Building Your First React Application',
            score: 0.62,
          },
        },
        {
          id: '3',
          action: 'BYPASS',
          reason: 'Emergency publication for time-sensitive news',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          draft: {
            title: 'Breaking: New WordPress 6.4 Released',
            score: 0.68,
          },
        },
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Audit logs fetch error:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getActionBadge = (action: 'APPROVE' | 'REJECT' | 'BYPASS') => {
    switch (action) {
      case 'APPROVE':
        return <Badge className="bg-orion-emerald text-white">Approved</Badge>;
      case 'REJECT':
        return <Badge className="bg-orion-crimson text-white">Rejected</Badge>;
      case 'BYPASS':
        return <Badge className="bg-orion-blue text-white">Bypassed</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  if (userRole !== 'ADMIN') {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-orion-navy mb-2">Admin Only</h3>
          <p className="text-gray-600">Audit logs are only accessible to administrators.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-orion-navy mb-2">No Activity</h3>
          <p className="text-gray-600">No review activity to display yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-orion-navy" />
        <h2 className="text-xl font-bold text-orion-navy">Review Activity</h2>
        <Badge variant="secondary">{logs.length} actions</Badge>
      </div>

      {logs.map((entry) => (
        <Card key={entry.id} className="border border-gray-200 rounded-lg">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-orion-background-light transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedItems.has(entry.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <CardTitle className="text-base font-semibold text-orion-navy">
                        {entry.draft.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1">
                        {getActionBadge(entry.action)}
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  {entry.draft.score && (
                    <Badge variant="outline" className="text-orion-navy">
                      Score: {(entry.draft.score * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 border-t border-gray-100">
                <div className="bg-orion-background-light p-4 rounded-lg mt-4">
                  <h4 className="text-sm font-semibold text-orion-navy mb-2">Review Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Action:</span>
                      <span className="ml-2 font-medium">{entry.action}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="ml-2">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {entry.reason && (
                    <div className="mt-3">
                      <span className="text-gray-600 text-sm">Reason:</span>
                      <p className="mt-1 text-sm text-orion-navy bg-white p-3 rounded border">
                        {entry.reason}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}

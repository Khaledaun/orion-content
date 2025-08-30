
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, SkipForward, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  title: string;
  score?: number;
  status: string;
  violations: any;
  createdAt: string;
  lastReview: any;
  violationsCount: number;
}

interface ReviewQueueProps {
  userRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export function ReviewQueue({ userRole }: ReviewQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<QueueItem | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/review/queue');
      if (!response.ok) throw new Error('Failed to fetch queue');
      
      const data = await response.json();
      setQueue(data.queue || []);
    } catch (error) {
      console.error('Queue fetch error:', error);
      toast.error('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (draftId: string, action: 'APPROVE' | 'REJECT' | 'BYPASS') => {
    if (!selectedDraft) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/review/drafts/${draftId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: reviewReason || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Action failed');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Remove item from queue and close dialog
      setQueue(prev => prev.filter(item => item.id !== draftId));
      setSelectedDraft(null);
      setReviewReason('');
      
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'bg-gray-100 text-gray-600';
    if (score >= 0.8) return 'bg-orion-emerald text-white';
    if (score >= 0.6) return 'bg-orion-amber text-white';
    return 'bg-orion-crimson text-white';
  };

  const getStatusBadge = (status: string, violationsCount: number) => {
    switch (status) {
      case 'NEEDS_REVIEW':
        return <Badge className="bg-orion-amber text-white">Needs Review</Badge>;
      case 'APPROVED':
        return <Badge className="bg-orion-emerald text-white">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-orion-crimson text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-orion-emerald mb-4" />
          <h3 className="text-lg font-semibold text-orion-navy mb-2">Queue Clear!</h3>
          <p className="text-gray-600">No items need review right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="h-5 w-5 text-orion-amber" />
        <h2 className="text-xl font-bold text-orion-navy">Review Queue</h2>
        <Badge variant="secondary">{queue.length} items</Badge>
      </div>

      {queue.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow border border-gray-200 rounded-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-orion-navy truncate mb-2">
                  {item.title}
                </CardTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(item.status, item.violationsCount)}
                  {item.score !== undefined && (
                    <Badge className={`${getScoreColor(item.score)} text-xs`}>
                      Score: {(item.score * 100).toFixed(0)}%
                    </Badge>
                  )}
                  {item.violationsCount > 0 && (
                    <Badge variant="outline" className="text-orion-crimson border-orion-crimson">
                      {item.violationsCount} violations
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {item.lastReview && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Last reviewed {new Date(item.lastReview.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-orion-navy text-orion-navy hover:bg-orion-navy hover:text-white"
                    onClick={() => setSelectedDraft(item)}
                  >
                    Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-orion-navy">{selectedDraft?.title}</DialogTitle>
                  </DialogHeader>
                  
                  {selectedDraft && (
                    <div className="space-y-4">
                      {/* Score and Violations Summary */}
                      <div className="bg-orion-background-light p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <span className="text-sm text-gray-600">Quality Score</span>
                            <div className={`inline-block px-2 py-1 rounded text-sm font-semibold ml-2 ${getScoreColor(selectedDraft.score)}`}>
                              {selectedDraft.score ? `${(selectedDraft.score * 100).toFixed(0)}%` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Violations</span>
                            <Badge variant="outline" className="ml-2 text-orion-crimson border-orion-crimson">
                              {selectedDraft.violationsCount}
                            </Badge>
                          </div>
                        </div>
                        
                        {selectedDraft.violations && Array.isArray(selectedDraft.violations) && selectedDraft.violations.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-orion-navy mb-2">Issues Found:</p>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {selectedDraft.violations.map((violation: any, index: number) => (
                                <li key={index} className="flex items-center gap-2">
                                  <AlertTriangle className="h-3 w-3 text-orion-amber" />
                                  {violation.type || violation.message || JSON.stringify(violation)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Review Reason */}
                      <div>
                        <label className="block text-sm font-semibold text-orion-navy mb-2">
                          Review Notes (optional)
                        </label>
                        <Textarea
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          placeholder="Add any notes about your review decision..."
                          className="min-h-[80px]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-end">
                        {userRole !== 'VIEWER' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleAction(selectedDraft.id, 'REJECT')}
                              disabled={actionLoading}
                              className="border-orion-crimson text-orion-crimson hover:bg-orion-crimson hover:text-white"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleAction(selectedDraft.id, 'APPROVE')}
                              disabled={actionLoading}
                              className="bg-orion-emerald hover:bg-orion-emerald-dark text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </>
                        )}
                        {userRole === 'ADMIN' && (
                          <Button
                            variant="outline"
                            onClick={() => handleAction(selectedDraft.id, 'BYPASS')}
                            disabled={actionLoading}
                            className="border-orion-blue text-orion-blue hover:bg-orion-blue hover:text-white"
                          >
                            <SkipForward className="h-4 w-4 mr-2" />
                            Bypass
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * One-Click WordPress Publish Component
 * Provides WordPress publishing controls with rulebook guardrails and RBAC
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Send,
  Loader2,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface WordPressPublishProps {
  siteId: string;
  draftId: string;
  draftTitle: string;
  qualityScore?: number;
  rulebookPassed?: boolean;
  violations?: Array<{
    rule: string;
    severity: "error" | "warning" | "info";
    message: string;
    suggestions: string[];
  }>;
  wordpressStatus?: {
    connected: boolean;
    postId?: number;
    postUrl?: string;
    status?: string;
    lastUpdated?: Date;
  };
  userRole: "ADMIN" | "EDITOR" | "VIEWER";
  onPublish?: (result: any) => void;
  onStatusUpdate?: (status: any) => void;
}

export function WordPressOneClickPublish({
  siteId,
  draftId,
  draftTitle,
  qualityScore = 0,
  rulebookPassed = false,
  violations = [],
  wordpressStatus,
  userRole,
  onPublish,
  onStatusUpdate,
}: WordPressPublishProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const canPublish = userRole === "ADMIN" || userRole === "EDITOR";
  const canStream = userRole === "ADMIN" || userRole === "EDITOR";
  const canView = userRole === "ADMIN" || userRole === "EDITOR" || userRole === "VIEWER";

  const criticalViolations = violations.filter(v => v.severity === "error");
  const warningViolations = violations.filter(v => v.severity === "warning");
  const infoViolations = violations.filter(v => v.severity === "info");

  const isPublishBlocked = criticalViolations.length > 0 || !rulebookPassed;
  const hasWarnings = warningViolations.length > 0;

  const handleAction = async (action: string, publishImmediately = false) => {
    if (!canPublish && (action === "publish" || publishImmediately)) {
      toast.error("You don't have permission to publish content");
      return;
    }

    if (!canStream && action === "stream_draft") {
      toast.error("You don't have permission to stream content");
      return;
    }

    setIsLoading(true);
    setCurrentAction(action);

    try {
      const response = await fetch("/api/wordpress/workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          draftId,
          action: publishImmediately ? "stream_and_publish" : action,
          publishImmediately,
          skipRulebookCheck: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process WordPress action");
      }

      if (result.success) {
        toast.success(
          publishImmediately 
            ? "Content published to WordPress successfully!" 
            : "Content streamed to WordPress successfully!"
        );
        
        if (onPublish) {
          onPublish(result);
        }
      } else {
        toast.error(result.error || "Failed to process WordPress action");
      }

      // Refresh status
      if (onStatusUpdate) {
        onStatusUpdate(result);
      }

    } catch (error) {
      console.error("WordPress action failed:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  };

  const getQualityBadge = () => {
    if (qualityScore >= 90) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Excellent ({qualityScore})</Badge>;
    } else if (qualityScore >= 80) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Good ({qualityScore})</Badge>;
    } else if (qualityScore >= 70) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Fair ({qualityScore})</Badge>;
    } else {
      return <Badge variant="destructive">Poor ({qualityScore})</Badge>;
    }
  };

  const getRulebookStatus = () => {
    if (rulebookPassed) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Rulebook Passed</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Rulebook Failed</span>
        </div>
      );
    }
  };

  const getWordPressStatus = () => {
    if (!wordpressStatus?.connected) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Not connected to WordPress</span>
        </div>
      );
    }

    const statusColors = {
      draft: "text-yellow-600",
      publish: "text-green-600",
      private: "text-blue-600",
      pending: "text-orange-600",
    };

    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium">Connected to WordPress</span>
        {wordpressStatus.status && (
          <Badge variant="outline" className={statusColors[wordpressStatus.status as keyof typeof statusColors]}>
            {wordpressStatus.status}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          WordPress Publishing
        </CardTitle>
        <CardDescription>
          Publish "{draftTitle}" to WordPress with quality guardrails
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quality Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quality Score</span>
            {getQualityBadge()}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Rulebook Status</span>
            {getRulebookStatus()}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">WordPress Status</span>
            {getWordPressStatus()}
          </div>
        </div>

        <Separator />

        {/* Violations */}
        {violations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Quality Issues
            </h4>
            
            {criticalViolations.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Issues ({criticalViolations.length}):</strong> These must be fixed before publishing.
                  <ul className="mt-2 space-y-1">
                    {criticalViolations.map((violation, index) => (
                      <li key={index} className="text-sm">
                        • {violation.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings ({warningViolations.length}):</strong> Consider addressing these issues.
                  <ul className="mt-2 space-y-1">
                    {warningViolations.slice(0, 3).map((violation, index) => (
                      <li key={index} className="text-sm">
                        • {violation.message}
                      </li>
                    ))}
                    {warningViolations.length > 3 && (
                      <li className="text-sm text-muted-foreground">
                        ... and {warningViolations.length - 3} more warnings
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {/* Stream Draft Button */}
            <Button
              onClick={() => handleAction("stream_draft")}
              disabled={!canStream || isLoading || !wordpressStatus?.connected}
              variant="outline"
              className="flex-1"
            >
              {isLoading && currentAction === "stream_draft" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Stream Draft
            </Button>

            {/* Publish Button */}
            <Button
              onClick={() => handleAction("publish")}
              disabled={!canPublish || isLoading || isPublishBlocked || !wordpressStatus?.connected}
              variant="default"
              className="flex-1"
            >
              {isLoading && currentAction === "publish" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publish
            </Button>
          </div>

          {/* One-Click Publish Button */}
          <Button
            onClick={() => handleAction("stream_and_publish", true)}
            disabled={!canPublish || isLoading || isPublishBlocked || !wordpressStatus?.connected}
            variant="default"
            className="w-full"
            size="lg"
          >
            {isLoading && currentAction === "stream_and_publish" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            One-Click Publish
          </Button>
        </div>

        {/* WordPress Links */}
        {wordpressStatus?.connected && wordpressStatus.postUrl && (
          <div className="space-y-2">
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(wordpressStatus.postUrl, "_blank")}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Post
              </Button>
              
              {wordpressStatus.status === "draft" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`${wordpressStatus.postUrl}?preview=true`, "_blank")}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Permission Notice */}
        {!canPublish && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You need Editor or Admin permissions to publish content to WordPress.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * WordPress Connection Manager Component
 * Manages WordPress site connections and credentials
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  TestTube,
} from "lucide-react";
import { toast } from "sonner";

interface WordPressConnectionManagerProps {
  siteId: string;
  onConnectionUpdate?: (connection: any) => void;
}

interface WordPressIntegration {
  id: string;
  siteId: string;
  siteUrl: string;
  verified: boolean;
  lastTestAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  siteInfo?: {
    name: string;
    description: string;
    url: string;
    version: string;
  };
}

export function WordPressConnectionManager({
  siteId,
  onConnectionUpdate,
}: WordPressConnectionManagerProps) {
  const [integration, setIntegration] = useState<WordPressIntegration | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    siteUrl: "",
    username: "",
    appPassword: "",
  });

  // Load existing integration on mount
  useEffect(() => {
    loadIntegration();
  }, [siteId]);

  const loadIntegration = async () => {
    try {
      const response = await fetch(
        `/api/integrations/wordpress?siteId=${siteId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setIntegration(data);
        setFormData({
          siteUrl: data.siteUrl || "",
          username: "",
          appPassword: "",
        });
      } else if (response.status !== 404) {
        throw new Error("Failed to load WordPress integration");
      }
    } catch (error) {
      console.error("Failed to load WordPress integration:", error);
      toast.error("Failed to load WordPress integration");
    }
  };

  const handleSave = async () => {
    if (!formData.siteUrl || !formData.username || !formData.appPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save WordPress credentials");
      }

      setIntegration(result);
      setFormData((prev) => ({ ...prev, appPassword: "" })); // Clear password

      toast.success("WordPress credentials saved successfully!");

      if (onConnectionUpdate) {
        onConnectionUpdate(result);
      }
    } catch (error) {
      console.error("Failed to save WordPress credentials:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save WordPress credentials",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!integration) {
      toast.error("No WordPress integration found");
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch("/api/integrations/wordpress/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Connection test failed");
      }

      if (result.success) {
        toast.success("WordPress connection test successful!");
        setIntegration((prev) =>
          prev ? { ...prev, verified: true, siteInfo: result.siteInfo } : null,
        );
      } else {
        toast.error(result.message || "Connection test failed");
      }
    } catch (error) {
      console.error("WordPress connection test failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Connection test failed",
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete the WordPress connection? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/integrations/wordpress?siteId=${siteId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || "Failed to delete WordPress connection",
        );
      }

      setIntegration(null);
      setFormData({ siteUrl: "", username: "", appPassword: "" });

      toast.success("WordPress connection deleted successfully!");

      if (onConnectionUpdate) {
        onConnectionUpdate(null);
      }
    } catch (error) {
      console.error("Failed to delete WordPress connection:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete WordPress connection",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatus = () => {
    if (!integration) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Not connected</span>
        </div>
      );
    }

    if (integration.verified) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Connected & Verified</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Connected (Needs Verification)
          </span>
        </div>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          WordPress Connection
        </CardTitle>
        <CardDescription>
          Connect your WordPress site to enable content publishing
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          {getConnectionStatus()}
        </div>

        {integration?.siteInfo && (
          <div className="space-y-2">
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Site Name:</span>
                <p className="text-muted-foreground">
                  {integration.siteInfo.name}
                </p>
              </div>
              <div>
                <span className="font-medium">WordPress Version:</span>
                <p className="text-muted-foreground">
                  {integration.siteInfo.version}
                </p>
              </div>
              <div>
                <span className="font-medium">Site URL:</span>
                <p className="text-muted-foreground">
                  {integration.siteInfo.url}
                </p>
              </div>
              <div>
                <span className="font-medium">Last Tested:</span>
                <p className="text-muted-foreground">
                  {integration.lastTestAt
                    ? new Date(integration.lastTestAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Connection Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteUrl">WordPress Site URL *</Label>
            <Input
              id="siteUrl"
              type="url"
              placeholder="https://yoursite.com"
              value={formData.siteUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, siteUrl: e.target.value }))
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL of your WordPress site (e.g.,
              https://yoursite.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">WordPress Username *</Label>
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Your WordPress username (not email)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appPassword">Application Password *</Label>
            <div className="relative">
              <Input
                id="appPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your WordPress application password"
                value={formData.appPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    appPassword: e.target.value,
                  }))
                }
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate an application password in your WordPress admin under
              Users → Profile
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={
              isLoading ||
              !formData.siteUrl ||
              !formData.username ||
              !formData.appPassword
            }
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            {integration ? "Update Connection" : "Connect WordPress"}
          </Button>

          {integration && (
            <Button
              onClick={handleTest}
              disabled={isTesting || isLoading}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test
            </Button>
          )}
        </div>

        {/* Delete Button */}
        {integration && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleDelete}
              disabled={isLoading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Delete Connection
            </Button>
          </div>
        )}

        {/* Help Text */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Need help setting up WordPress?</strong>
            <br />
            1. Go to your WordPress admin dashboard
            <br />
            2. Navigate to Users → Profile
            <br />
            3. Scroll down to "Application Passwords"
            <br />
            4. Create a new application password for Orion
            <br />
            5. Copy the generated password and paste it above
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

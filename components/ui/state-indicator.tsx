"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ConnectionState =
  | "connected"
  | "error"
  | "action-required"
  | "unknown"
  | "loading";

interface StateIndicatorProps {
  state: ConnectionState;
  label?: string;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  className?: string;
}

const stateConfig = {
  connected: {
    icon: CheckCircle,
    variant: "default" as const,
    className: "bg-green-100 text-green-800 border-green-200",
    defaultLabel: "Connected",
  },
  error: {
    icon: XCircle,
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 border-red-200",
    defaultLabel: "Error",
  },
  "action-required": {
    icon: AlertTriangle,
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    defaultLabel: "Action Required",
  },
  unknown: {
    icon: HelpCircle,
    variant: "outline" as const,
    className: "bg-gray-100 text-gray-800 border-gray-200",
    defaultLabel: "Unknown",
  },
  loading: {
    icon: Loader2,
    variant: "outline" as const,
    className: "bg-blue-100 text-blue-800 border-blue-200",
    defaultLabel: "Loading",
  },
} as const;

export function StateIndicator({
  state,
  label,
  size = "default",
  showIcon = true,
  className,
}: StateIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        config.className,
        sizeClasses[size],
        className,
      )}
    >
      {showIcon && (
        <Icon
          className={cn(iconSizes[size], state === "loading" && "animate-spin")}
        />
      )}
      <span>{displayLabel}</span>
    </Badge>
  );
}

// Helper function to determine state from various conditions
export function getConnectionState(
  isConnected?: boolean,
  hasError?: boolean,
  needsAction?: boolean,
  isLoading?: boolean,
): ConnectionState {
  if (isLoading) return "loading";
  if (hasError) return "error";
  if (needsAction) return "action-required";
  if (isConnected === true) return "connected";
  if (isConnected === false) return "error";
  return "unknown";
}

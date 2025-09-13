'use client';

import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'default',
  className,
  fullScreen = false 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const content = (
    <div className={cn(
      'flex items-center justify-center gap-3',
      fullScreen ? 'min-h-[400px]' : 'py-8',
      className
    )}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      <span 
        className="text-muted-foreground"
        aria-live="polite"
        aria-label={message}
      >
        {message}
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

interface ErrorStateProps {
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  fullScreen?: boolean;
  showDetails?: boolean;
}

export function ErrorState({ 
  message = 'Something went wrong',
  error,
  onRetry,
  retryLabel = 'Try again',
  className,
  fullScreen = false,
  showDetails = false 
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-4 text-center',
      fullScreen ? 'min-h-[400px]' : 'py-8',
      className
    )}>
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">{message}</span>
      </div>
      
      {showDetails && errorMessage && (
        <div className="text-sm text-muted-foreground max-w-md">
          <details className="mt-2">
            <summary className="cursor-pointer hover:text-foreground">
              Show error details
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-left font-mono text-xs break-all">
              {errorMessage}
            </div>
          </details>
        </div>
      )}
      
      {onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline" 
          className="gap-2"
          aria-label={retryLabel}
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <Card className="w-full border-destructive/20">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

export function EmptyState({ 
  title = 'No data available',
  description,
  action,
  icon,
  className,
  fullScreen = false 
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-4 text-center',
      fullScreen ? 'min-h-[400px]' : 'py-8',
      className
    )}>
      {icon && (
        <div className="text-muted-foreground/50">
          {icon}
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>
      
      {action && action}
    </div>
  );

  if (fullScreen) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}
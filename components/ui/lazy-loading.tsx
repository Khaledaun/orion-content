"use client";

import { Suspense, lazy, ComponentType } from "react";
import { LoadingSpinner } from "./loading-spinner";

interface LazyComponentProps {
  fallback?: React.ReactNode;
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-built lazy components for common use cases
export const LazyAnalyticsDashboard = createLazyComponent(
  () => import("@/app/analytics/page"),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>,
);

export const LazyChart = createLazyComponent(
  () => import("react-chartjs-2").then((mod) => ({ default: mod.Line })),
  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <LoadingSpinner />
  </div>,
);

// Intersection Observer based lazy loading for images and content
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      {...props}
      style={{
        ...props.style,
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

// Lazy loading wrapper for heavy components
export function LazySection({
  children,
  _threshold = 0.1,
  _rootMargin = "50px",
}: {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100px", // Prevent layout shift
      }}
    >
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </div>
  );
}

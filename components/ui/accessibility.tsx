'use client';

import React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * Visually hidden component for screen reader only content
 * Follows WCAG guidelines for accessible hidden content
 */
export function VisuallyHidden({ children, asChild = false }: VisuallyHiddenProps) {
  const className = "sr-only absolute left-[-10000px] top-auto width-[1px] height-[1px] overflow-hidden";
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${children.props.className || ''} ${className}`.trim(),
    });
  }

  return (
    <span className={className}>
      {children}
    </span>
  );
}

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Skip link component for keyboard navigation accessibility
 */
export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground 
        focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring
        ${className}
      `}
      tabIndex={0}
    >
      {children}
    </a>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  level?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

/**
 * Live region for announcing dynamic content changes to screen readers
 */
export function LiveRegion({ 
  children, 
  level = 'polite',
  atomic = false,
  relevant = 'text',
  className = '' 
}: LiveRegionProps) {
  return (
    <div
      aria-live={level}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {children}
    </div>
  );
}

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

/**
 * Simple focus trap for modal dialogs and overlays
 */
export function FocusTrap({ children, active = true, className = '' }: FocusTrapProps) {
  const trapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active || !trapRef.current) return;

    const element = trapRef.current;
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={trapRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Hook for managing focus on route changes
 */
export function useFocusManagement() {
  const focusMainContent = React.useCallback(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.focus();
      mainElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const announcePage = React.useCallback((title: string) => {
    // Create temporary announcement element
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Navigated to ${title}`;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return {
    focusMainContent,
    announcePage,
  };
}
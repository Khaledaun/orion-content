
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

export function ResponsiveContainer({ 
  children, 
  className, 
  maxWidth = "2xl" 
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full"
  }

  return (
    <div className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  )
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { sm: 1, md: 2, lg: 3 }
}: {
  children: React.ReactNode
  className?: string
  cols?: { sm?: number; md?: number; lg?: number; xl?: number }
}) {
  const gridClasses = [
    `grid gap-6`,
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ')

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  )
}

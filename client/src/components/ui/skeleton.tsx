import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Base skeleton component for loading states
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700",
        className
      )}
      style={{
        animation: "skeleton-loading 1.8s ease-in-out infinite"
      }}
      {...props}
    />
  )
}

/**
 * Skeleton for text content with realistic proportions
 */
function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
          )}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for card components
 */
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <SkeletonText lines={3} />
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for dashboard stats
 */
function SkeletonStats({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
        className
      )}
      {...props}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-8 w-24" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for table rows
 */
function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { rows?: number; columns?: number }) {
  return (
    <div
      className={cn(
        "w-full border rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="bg-gray-50 border-b p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-b-0 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="space-y-1">
                <Skeleton className="h-4 w-full" />
                {colIndex === 0 && <Skeleton className="h-3 w-2/3" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for navigation menu
 */
function SkeletonNavigation({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <nav
      className={cn(
        "bg-white border-b-2 border-blue-300 shadow-lg p-4",
        className
      )}
      {...props}
    >
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex space-x-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </nav>
  )
}

/**
 * Skeleton for portfolio/dashboard content
 */
function SkeletonPortfolio({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Header stats */}
      <SkeletonStats />
      
      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-white rounded-lg border p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recent activity */}
      <div className="bg-white rounded-lg border p-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <SkeletonTable rows={3} columns={3} />
      </div>
    </div>
  )
}

// Add the skeleton animation CSS
const skeletonStyles = `
@keyframes skeleton-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = skeletonStyles;
  document.head.appendChild(style);
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonStats, 
  SkeletonTable, 
  SkeletonNavigation,
  SkeletonPortfolio
}

import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: { container: 'py-8', icon: 'w-12 h-12', title: 'text-lg', desc: 'text-sm' },
    md: { container: 'py-12', icon: 'w-16 h-16', title: 'text-xl', desc: 'text-base' },
    lg: { container: 'py-16', icon: 'w-20 h-20', title: 'text-2xl', desc: 'text-lg' }
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses[size].container,
      className
    )}>
      {icon && (
        <div className={cn(
          "mb-4 text-gray-300",
          sizeClasses[size].icon
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn(
        "font-semibold text-gray-900 mb-2",
        sizeClasses[size].title
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-gray-500 max-w-md mb-6",
          sizeClasses[size].desc
        )}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                action.variant === 'secondary'
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-lg hover:shadow-xl"
              )}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyStateNoData({ onAction, actionLabel = "Get Started" }: { onAction?: () => void; actionLabel?: string }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      }
      title="No data yet"
      description="Start by adding your first item to see it appear here."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
    />
  );
}

export function EmptyStateSearch({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}". Try adjusting your search.` : "Try adjusting your filters or search terms."}
      action={onClear ? { label: "Clear Search", onClick: onClear, variant: 'secondary' } : undefined}
    />
  );
}

export function EmptyStateError({ 
  title = "Something went wrong", 
  description = "We encountered an error. Please try again.",
  onRetry 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void 
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
      title={title}
      description={description}
      action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
    />
  );
}

export function EmptyStateNoAccess({ onBack }: { onBack?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
      title="Access Restricted"
      description="You don't have permission to view this content. Contact support if you believe this is an error."
      action={onBack ? { label: "Go Back", onClick: onBack, variant: 'secondary' } : undefined}
    />
  );
}

export function EmptyStateComingSoon({ feature }: { feature?: string }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      }
      title="Coming Soon"
      description={feature ? `${feature} is currently in development and will be available soon.` : "This feature is coming soon. Stay tuned!"}
    />
  );
}

export function EmptyStateOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
      }
      title="You're Offline"
      description="Please check your internet connection and try again."
      action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
    />
  );
}

export function EmptyStateLandCandidates({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="No Land Candidates Yet"
      description="Land opportunities are added regularly. Check back soon or explore our land stewardship program."
      action={onExplore ? { label: "Learn About Land Stewardship", onClick: onExplore } : undefined}
    />
  );
}

export function EmptyStateWallet({ onConnect }: { onConnect?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
      title="Connect Your Wallet"
      description="Connect your Web3 wallet to access DeFi features, staking, and governance."
      action={onConnect ? { label: "Connect Wallet", onClick: onConnect } : undefined}
    />
  );
}

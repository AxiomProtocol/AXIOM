import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from '../../lib/utils';

/**
 * Enhanced loading spinner with customizable size and color
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  className,
  label 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    gray: 'text-gray-600'
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg
        className={cn(
          "animate-spin",
          sizeClasses[size],
          colorClasses[color]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label={label || "Loading"}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className={cn("ml-2 text-sm", colorClasses[color])}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Progress bar with percentage display
 */
interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  label?: string;
}

export function ProgressBar({
  progress,
  className,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  animated = true,
  label
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress from 0 to target value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  const clampedProgress = Math.min(Math.max(displayProgress, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        "w-full bg-gray-200 rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorClasses[color],
            animated && "bg-gradient-to-r from-current via-current to-current bg-[length:200%_100%] animate-pulse"
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading overlay for entire sections
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  transparent?: boolean;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  message = "Loading...",
  transparent = false,
  className
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center z-50",
          transparent ? "bg-white/70" : "bg-white/90",
          "backdrop-blur-sm"
        )}>
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pulse animation for loading placeholders
 */
interface PulseLoaderProps {
  className?: string;
  dotCount?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

export function PulseLoader({
  className,
  dotCount = 3,
  size = 'md',
  color = 'blue'
}: PulseLoaderProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className={cn("flex space-x-2", className)}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full animate-pulse",
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );
}

/**
 * Enhanced button with loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-transparent',
    outline: 'border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100 border-transparent'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200 ease-in-out",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size={size === 'lg' ? 'md' : 'sm'} 
          color={variant === 'primary' ? 'gray' : 'blue'}
          className="mr-2"
        />
      )}
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
}

/**
 * Typing animation effect
 */
interface TypingEffectProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypingEffect({
  text,
  speed = 50,
  className,
  onComplete
}: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

/**
 * Smart loading component that shows different states based on loading time
 */
interface SmartLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  fastThreshold?: number; // ms
  slowThreshold?: number; // ms
  className?: string;
}

export function SmartLoading({
  isLoading,
  children,
  fastThreshold = 300,
  slowThreshold = 2000,
  className
}: SmartLoadingProps) {
  const [loadingState, setLoadingState] = useState<'none' | 'fast' | 'normal' | 'slow'>('none');

  useEffect(() => {
    if (!isLoading) {
      setLoadingState('none');
      return;
    }

    // Show simple spinner for fast operations
    const fastTimer = setTimeout(() => {
      setLoadingState('fast');
    }, fastThreshold);

    // Show more detailed loading for normal operations
    const normalTimer = setTimeout(() => {
      setLoadingState('normal');
    }, fastThreshold + 500);

    // Show "this is taking longer" message for slow operations
    const slowTimer = setTimeout(() => {
      setLoadingState('slow');
    }, slowThreshold);

    return () => {
      clearTimeout(fastTimer);
      clearTimeout(normalTimer);
      clearTimeout(slowTimer);
    };
  }, [isLoading, fastThreshold, slowThreshold]);

  if (!isLoading) {
    return <>{children}</>;
  }

  const LoadingContent = () => {
    switch (loadingState) {
      case 'fast':
        return <LoadingSpinner size="sm" />;
      case 'normal':
        return (
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        );
      case 'slow':
        return (
          <div className="text-center max-w-xs mx-auto">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">This is taking longer than expected...</p>
            <p className="mt-1 text-xs text-gray-500">Please wait while we process your request.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-center justify-center min-h-[100px]", className)}>
      <LoadingContent />
    </div>
  );
}

// Export Progress as an alias to ProgressBar for compatibility
export const Progress = ProgressBar;

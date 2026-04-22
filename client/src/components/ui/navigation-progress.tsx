import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface NavigationProgressProps {
  isNavigating: boolean;
  color?: string;
  height?: number;
  duration?: number;
}

export function NavigationProgress({
  isNavigating,
  color = '#00d4aa',
  height = 3,
  duration = 400
}: NavigationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setProgress(0);
      
      const timer1 = setTimeout(() => setProgress(30), 50);
      const timer2 = setTimeout(() => setProgress(60), 200);
      const timer3 = setTimeout(() => setProgress(80), 400);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, visible, duration]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{ height }}
    >
      <div
        className="h-full transition-all ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          transitionDuration: progress === 100 ? `${duration}ms` : '300ms',
          boxShadow: `0 0 10px ${color}`
        }}
      />
    </div>
  );
}

export function useNavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => setIsNavigating(true), []);
  const endNavigation = useCallback(() => setIsNavigating(false), []);

  return { isNavigating, startNavigation, endNavigation };
}

export function PageLoadingOverlay({
  isLoading,
  message = "Loading...",
  logo
}: {
  isLoading: boolean;
  message?: string;
  logo?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
      setTimeout(() => setOpacity(1), 10);
    } else {
      setOpacity(0);
      setTimeout(() => setShow(false), 300);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="text-center">
        {logo && (
          <div className="mb-4 animate-pulse">
            {logo}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function SectionLoader({ 
  height = '200px',
  message 
}: { 
  height?: string;
  message?: string;
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-gray-50 rounded-lg"
      style={{ minHeight: height }}
    >
      <div className="relative">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full" />
        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-teal-500 rounded-full animate-spin" />
      </div>
      {message && (
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}

export function InlineLoader({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2'
  };

  return (
    <span className="inline-flex items-center">
      <span
        className={cn(
          "rounded-full border-gray-300 border-t-teal-500 animate-spin",
          sizeClasses[size]
        )}
      />
    </span>
  );
}

export function ButtonLoader() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

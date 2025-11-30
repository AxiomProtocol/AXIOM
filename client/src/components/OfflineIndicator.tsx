import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { FadeTransition, SlideTransition } from './ui/transitions';
import { cn } from '../lib/utils';

/**
 * Offline indicator component that shows network status and provides user feedback
 */
export function OfflineIndicator() {
  const { isOnline, isSlowConnection, retryCount, isRetrying } = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [lastOnlineStatus, setLastOnlineStatus] = useState(isOnline);
  const [isMinimized, setIsMinimized] = useState(false);

  // Show notification when network status changes
  useEffect(() => {
    if (lastOnlineStatus !== isOnline) {
      setShowNotification(true);
      setIsMinimized(false);
      
      // Auto-hide success message after 3 seconds
      if (isOnline) {
        const timer = setTimeout(() => {
          setShowNotification(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
      
      setLastOnlineStatus(isOnline);
    }
  }, [isOnline, lastOnlineStatus]);

  // Don't show if online and no notification needed
  if (isOnline && !showNotification) {
    return null;
  }

  const getNotificationContent = () => {
    if (!isOnline) {
      return {
        icon: '📡',
        title: 'You\'re offline',
        message: 'Some features may be limited. We\'ll reconnect automatically.',
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        showRetry: retryCount > 0
      };
    } else if (isSlowConnection) {
      return {
        icon: '🐌',
        title: 'Slow connection detected',
        message: 'Loading may take longer than usual.',
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        showRetry: false
      };
    } else {
      return {
        icon: '✅',
        title: 'Back online!',
        message: 'All features are now available.',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        showRetry: false
      };
    }
  };

  const content = getNotificationContent();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setShowNotification(false);
  };

  return (
    <>
      {/* Full notification */}
      <SlideTransition
        show={showNotification && !isMinimized}
        direction="down"
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className={cn(
          "rounded-lg shadow-lg p-4 min-w-[320px] max-w-md mx-auto",
          content.bgColor,
          content.textColor
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">{content.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{content.title}</h3>
                <p className="text-xs opacity-90 mt-1">{content.message}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {content.showRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition-colors"
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              
              {!isOnline && (
                <button
                  onClick={handleMinimize}
                  className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                  title="Minimize"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {retryCount > 0 && (
            <div className="mt-2 text-xs opacity-75">
              Retry attempt {retryCount}/3
            </div>
          )}
        </div>
      </SlideTransition>

      {/* Minimized indicator */}
      <FadeTransition show={!isOnline && isMinimized}>
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition-colors z-50"
          title="You're offline - click to expand"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm">📡</span>
            <span className="hidden sm:inline text-xs font-medium">Offline</span>
          </div>
        </button>
      </FadeTransition>
    </>
  );
}

/**
 * Network status badge for showing in headers/navigation
 */
interface NetworkStatusBadgeProps {
  className?: string;
  showText?: boolean;
}

export function NetworkStatusBadge({ 
  className, 
  showText = true 
}: NetworkStatusBadgeProps) {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        color: 'bg-red-500',
        icon: '📡',
        text: 'Offline'
      };
    } else if (isSlowConnection) {
      return {
        color: 'bg-yellow-500',
        icon: '🐌',
        text: 'Slow'
      };
    } else {
      return {
        color: 'bg-green-500',
        icon: '✅',
        text: 'Online'
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn(
        "w-3 h-3 rounded-full animate-pulse",
        status.color
      )} />
      {showText && (
        <span className="text-sm text-gray-600">
          {status.text}
        </span>
      )}
    </div>
  );
}

/**
 * Offline banner for critical pages
 */
interface OfflineBannerProps {
  show?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function OfflineBanner({ 
  show, 
  onRetry,
  className 
}: OfflineBannerProps) {
  const { isOnline } = useNetworkStatus();
  const shouldShow = show !== undefined ? show : !isOnline;

  if (!shouldShow) return null;

  return (
    <SlideTransition show={shouldShow} direction="down">
      <div className={cn(
        "bg-yellow-50 border-l-4 border-yellow-400 p-4",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Limited connectivity:</strong> Some features may not work properly while offline.
              </p>
            </div>
          </div>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </SlideTransition>
  );
}

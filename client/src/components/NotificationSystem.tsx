import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { FadeTransition, SlideTransition } from './ui/transitions';
import { cn } from '../lib/utils';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * Notification Provider Component
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [position] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000,
      dismissible: notification.dismissible ?? true
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove after duration (if not persistent)
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update notification
  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
    );
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    updateNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer position={position} />
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use the notification system
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Notification Container Component
 */
function NotificationContainer({ 
  position 
}: { 
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' 
}) {
  const { notifications } = useNotifications();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return createPortal(
    <div className={cn(
      'fixed z-50 flex flex-col space-y-3 pointer-events-none',
      positionClasses[position]
    )}>
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          index={index}
          position={position}
        />
      ))}
    </div>,
    document.body
  );
}

/**
 * Individual Notification Item Component
 */
function NotificationItem({ 
  notification, 
  index,
  position 
}: { 
  notification: Notification;
  index: number;
  position: string;
}) {
  const { removeNotification } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Show notification with slight delay for staggered animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);

    return () => clearTimeout(timer);
  }, [index]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 200);
  };

  return (
    <SlideTransition
      show={isVisible}
      direction={position.includes('right') ? 'right' : 'left'}
    >
      <div
        className={cn(
          'pointer-events-auto w-80 max-w-sm rounded-lg border shadow-lg p-4',
          getBackgroundColor(),
          'transform transition-all duration-200 ease-in-out',
          isHovered && 'scale-105'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {notification.title}
            </p>
            {notification.message && (
              <p className="mt-1 text-sm text-gray-700">
                {notification.message}
              </p>
            )}
            
            {notification.action && (
              <div className="mt-3">
                <button
                  onClick={notification.action.onClick}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {notification.action.label}
                </button>
              </div>
            )}
          </div>

          {notification.dismissible && (
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Progress bar for timed notifications */}
        {notification.duration > 0 && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div
              className={cn(
                'h-1 rounded-full transition-all ease-linear',
                notification.type === 'success' && 'bg-green-400',
                notification.type === 'error' && 'bg-red-400',
                notification.type === 'warning' && 'bg-yellow-400',
                notification.type === 'info' && 'bg-blue-400'
              )}
              style={{
                width: '100%',
                animation: `shrink ${notification.duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </SlideTransition>
  );
}

/**
 * Enhanced notification helpers with accessibility and smart features
 */
export function useNotificationHelpers() {
  const { addNotification } = useNotifications();

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    // Announce to screen readers
    const announceText = message ? `${title}: ${message}` : title;
    window.dispatchEvent(new CustomEvent('screenReaderAnnounce', { 
      detail: { message: announceText, priority: 'polite' } 
    }));

    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    // Announce errors assertively to screen readers
    const announceText = message ? `Error: ${title}: ${message}` : `Error: ${title}`;
    window.dispatchEvent(new CustomEvent('screenReaderAnnounce', { 
      detail: { message: announceText, priority: 'assertive' } 
    }));

    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Errors persist by default
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const announceText = message ? `Warning: ${title}: ${message}` : `Warning: ${title}`;
    window.dispatchEvent(new CustomEvent('screenReaderAnnounce', { 
      detail: { message: announceText, priority: 'polite' } 
    }));

    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const announceText = message ? `${title}: ${message}` : title;
    window.dispatchEvent(new CustomEvent('screenReaderAnnounce', { 
      detail: { message: announceText, priority: 'polite' } 
    }));

    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // Enhanced helpers with smart features
  const showFormSaved = useCallback((formName?: string) => {
    return showSuccess(
      'Changes Saved',
      formName ? `Your ${formName} has been saved successfully.` : 'Your changes have been saved.',
      { 
        duration: 3000,
        action: {
          label: 'Undo',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('undoLastAction'));
          }
        }
      }
    );
  }, [showSuccess]);

  const showFormError = useCallback((field?: string, validation?: string) => {
    return showError(
      'Form Validation Error',
      field && validation ? `${field}: ${validation}` : 'Please check your input and try again.',
      { duration: 5000 }
    );
  }, [showError]);

  const showOfflineMode = useCallback(() => {
    return showWarning(
      'Offline Mode',
      'You are currently offline. Changes will be saved when connection is restored.',
      { 
        duration: 0, // Persist until online
        action: {
          label: 'Retry Connection',
          onClick: () => {
            window.location.reload();
          }
        }
      }
    );
  }, [showWarning]);

  const showConnectionRestored = useCallback(() => {
    return showSuccess(
      'Connection Restored',
      'You are back online. Syncing your changes...',
      { duration: 3000 }
    );
  }, [showSuccess]);

  const showLoadingProgress = useCallback((message: string, progress?: number) => {
    const progressText = progress !== undefined ? ` (${Math.round(progress)}%)` : '';
    return showInfo(
      'Loading',
      `${message}${progressText}`,
      { duration: 0, dismissible: false }
    );
  }, [showInfo]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showFormSaved,
    showFormError,
    showOfflineMode,
    showConnectionRestored,
    showLoadingProgress
  };
}

// CSS for the shrink animation
const style = document.createElement('style');
style.textContent = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('notification-styles')) {
  style.id = 'notification-styles';
  document.head.appendChild(style);
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storage, StorageKeys } from '../utils/storage';

interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  lastOnlineTime: number | null;
  queuedActions: OfflineAction[];
  syncInProgress: boolean;
}

/**
 * Enhanced offline support with queued actions and smart sync
 */
export function EnhancedOfflineSupport() {
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isServiceWorkerReady: false,
    lastOnlineTime: navigator.onLine ? Date.now() : null,
    queuedActions: [],
    syncInProgress: false
  });

  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Load queued actions from storage
  useEffect(() => {
    const storedActions = storage.getItem(StorageKeys.OFFLINE_ACTIONS, { fallback: [] });
    if (storedActions.length > 0) {
      setOfflineState(prev => ({ ...prev, queuedActions: storedActions }));
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online');
      setOfflineState(prev => ({
        ...prev,
        isOnline: true,
        lastOnlineTime: Date.now()
      }));
      setShowOfflineNotification(false);
      
      // Trigger sync after a short delay to ensure connection is stable
      setTimeout(syncQueuedActions, 1000);
    };

    const handleOffline = () => {
      console.log('📡 Gone offline');
      setOfflineState(prev => ({ ...prev, isOnline: false }));
      setShowOfflineNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setShowOfflineNotification(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker communication (registration handled in index.html)
  useEffect(() => {
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Wait for existing registration (from index.html)
          const registration = await navigator.serviceWorker.ready;
          console.log('✅ Service Worker ready:', registration);
          
          setOfflineState(prev => ({ ...prev, isServiceWorkerReady: true }));

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
          
        } catch (error) {
          console.error('🚨 Service Worker communication setup failed:', error);
        }
      }
    };

    checkServiceWorker();

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'BACKGROUND_SYNC_COMPLETE':
        console.log('🔄 Background sync completed');
        setSyncStatus('Background sync completed');
        setTimeout(() => setSyncStatus(''), 3000);
        break;
        
      case 'CACHE_UPDATED':
        console.log('📦 Cache updated');
        break;
        
      case 'OFFLINE_FALLBACK':
        console.log('📱 Using offline fallback');
        break;
    }
  }, []);

  // Queue action for offline processing
  const queueAction = useCallback((type: string, payload: any, maxRetries: number = 3) => {
    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    setOfflineState(prev => {
      const newActions = [...prev.queuedActions, action];
      // Persist to storage
      storage.setItem(StorageKeys.OFFLINE_ACTIONS, newActions);
      return { ...prev, queuedActions: newActions };
    });

    console.log('📥 Action queued for offline processing:', action);
    return action.id;
  }, []);

  // Remove action from queue
  const removeAction = useCallback((actionId: string) => {
    setOfflineState(prev => {
      const newActions = prev.queuedActions.filter(action => action.id !== actionId);
      storage.setItem(StorageKeys.OFFLINE_ACTIONS, newActions);
      return { ...prev, queuedActions: newActions };
    });
  }, []);

  // Sync queued actions when back online
  const syncQueuedActions = useCallback(async () => {
    if (!offlineState.isOnline || offlineState.syncInProgress || offlineState.queuedActions.length === 0) {
      return;
    }

    setOfflineState(prev => ({ ...prev, syncInProgress: true }));
    setSyncStatus('Syncing offline actions...');

    const actionsToSync = [...offlineState.queuedActions];
    let successCount = 0;
    let failureCount = 0;

    for (const action of actionsToSync) {
      try {
        const success = await processAction(action);
        
        if (success) {
          removeAction(action.id);
          successCount++;
          console.log('✅ Action synced successfully:', action.id);
        } else {
          // Increment retry count
          if (action.retryCount < action.maxRetries) {
            setOfflineState(prev => ({
              ...prev,
              queuedActions: prev.queuedActions.map(a => 
                a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a
              )
            }));
          } else {
            // Max retries reached, remove action
            removeAction(action.id);
            failureCount++;
            console.warn('❌ Action failed after max retries:', action.id);
          }
        }
      } catch (error) {
        console.error('🚨 Error processing action:', action.id, error);
        failureCount++;
      }
    }

    setOfflineState(prev => ({ ...prev, syncInProgress: false }));
    
    if (successCount > 0 || failureCount > 0) {
      setSyncStatus(`Sync complete: ${successCount} success, ${failureCount} failed`);
      setTimeout(() => setSyncStatus(''), 5000);
    }
  }, [offlineState.isOnline, offlineState.syncInProgress, offlineState.queuedActions, removeAction]);

  // Process individual action
  const processAction = async (action: OfflineAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'form_submission':
          return await processFormSubmission(action.payload);
        
        case 'api_call':
          return await processApiCall(action.payload);
        
        case 'user_preference':
          return await processUserPreference(action.payload);
        
        case 'portfolio_update':
          return await processPortfolioUpdate(action.payload);
        
        default:
          console.warn('⚠️ Unknown action type:', action.type);
          return false;
      }
    } catch (error) {
      console.error('🚨 Error processing action:', error);
      return false;
    }
  };

  // Action processors
  const processFormSubmission = async (payload: any): Promise<boolean> => {
    try {
      const response = await fetch(payload.endpoint, {
        method: payload.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...payload.headers
        },
        body: JSON.stringify(payload.data)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const processApiCall = async (payload: any): Promise<boolean> => {
    try {
      const response = await fetch(payload.url, payload.options);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const processUserPreference = async (payload: any): Promise<boolean> => {
    try {
      // Update user preferences
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const processPortfolioUpdate = async (payload: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/portfolio/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Auto-sync periodically when online
  useEffect(() => {
    if (offlineState.isOnline && offlineState.queuedActions.length > 0) {
      const interval = setInterval(() => {
        syncQueuedActions();
      }, 30000); // Try to sync every 30 seconds

      return () => clearInterval(interval);
    }
  }, [offlineState.isOnline, offlineState.queuedActions.length, syncQueuedActions]);

  // Expose offline functionality globally
  useEffect(() => {
    (window as any).SWFOffline = {
      queueAction,
      syncNow: syncQueuedActions,
      getQueuedActions: () => offlineState.queuedActions,
      getOfflineState: () => offlineState
    };

    return () => {
      delete (window as any).SWFOffline;
    };
  }, [queueAction, syncQueuedActions, offlineState]);

  return (
    <>
      {/* Offline Notification */}
      {showOfflineNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">You're offline</span>
            <span className="text-sm opacity-90">- Changes will sync when reconnected</span>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {syncStatus && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded shadow-lg text-sm">
          {syncStatus}
        </div>
      )}

      {/* Queued Actions Indicator */}
      {offlineState.queuedActions.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${offlineState.syncInProgress ? 'bg-white animate-pulse' : 'bg-white'}`}></div>
              <span>{offlineState.queuedActions.length} actions queued</span>
              {offlineState.isOnline && !offlineState.syncInProgress && (
                <button
                  onClick={syncQueuedActions}
                  className="text-xs underline hover:no-underline"
                >
                  Sync now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook for offline functionality
 */
export function useOfflineSupport() {
  const queueAction = useCallback((type: string, payload: any, maxRetries?: number) => {
    return (window as any).SWFOffline?.queueAction(type, payload, maxRetries);
  }, []);

  const syncNow = useCallback(() => {
    return (window as any).SWFOffline?.syncNow();
  }, []);

  const getOfflineState = useCallback(() => {
    return (window as any).SWFOffline?.getOfflineState() || { isOnline: navigator.onLine };
  }, []);

  return {
    queueAction,
    syncNow,
    getOfflineState
  };
}

/**
 * HOC for offline-capable API calls
 */
export function withOfflineSupport<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  actionType: string,
  fallbackData?: any
): T {
  return (async (...args: any[]) => {
    try {
      if (!navigator.onLine) {
        // Queue for offline processing
        const actionPayload = {
          function: apiCall.name,
          args,
          timestamp: Date.now()
        };
        
        (window as any).SWFOffline?.queueAction(actionType, actionPayload);
        
        // Return fallback data or throw offline error
        if (fallbackData !== undefined) {
          return fallbackData;
        } else {
          throw new Error('Offline: Action queued for later');
        }
      }

      return await apiCall(...args);
    } catch (error) {
      if (!navigator.onLine) {
        // Queue failed online call for retry
        const actionPayload = {
          function: apiCall.name,
          args,
          timestamp: Date.now(),
          error: error.message
        };
        
        (window as any).SWFOffline?.queueAction(actionType, actionPayload);
      }
      
      throw error;
    }
  }) as T;
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useLocalStorage } from './useLocalStorage';

export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  url?: string;
  method?: string;
}

/**
 * Hook for managing offline actions and background sync
 */
export function useOfflineActions() {
  const { isOnline, retryWithBackoff } = useNetworkStatus();
  const [queuedActions, setQueuedActions] = useLocalStorage<OfflineAction[]>('swf-offline-actions', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Process queued actions when coming back online
  useEffect(() => {
    if (isOnline && queuedActions.length > 0 && !processingRef.current) {
      processQueuedActions();
    }
  }, [isOnline, queuedActions.length]);

  // Add action to offline queue
  const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3
    };

    setQueuedActions(prev => [...prev, queuedAction]);
    
    console.log('📥 Queued offline action:', queuedAction.type);
    
    // If online, try to process immediately
    if (isOnline) {
      processAction(queuedAction);
    }

    return queuedAction.id;
  }, [isOnline, setQueuedActions]);

  // Process all queued actions
  const processQueuedActions = useCallback(async () => {
    if (processingRef.current || queuedActions.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    console.log(`🔄 Processing ${queuedActions.length} queued actions`);

    const failedActions: OfflineAction[] = [];
    
    for (const action of queuedActions) {
      try {
        const success = await processAction(action);
        if (!success) {
          if (action.retryCount < action.maxRetries) {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1
            });
          } else {
            console.error('❌ Action failed after max retries:', action);
          }
        }
      } catch (error) {
        console.error('❌ Failed to process action:', action, error);
        if (action.retryCount < action.maxRetries) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1
          });
        }
      }
    }

    // Update queue with only failed actions that haven't exceeded max retries
    setQueuedActions(failedActions);
    
    setIsProcessing(false);
    processingRef.current = false;

    console.log(`✅ Processed queued actions. ${failedActions.length} actions remain queued.`);
  }, [queuedActions, setQueuedActions]);

  // Process individual action
  const processAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'form-submission':
          return await processFormSubmission(action);
        case 'api-call':
          return await processApiCall(action);
        case 'user-preference':
          return await processUserPreference(action);
        case 'portfolio-update':
          return await processPortfolioUpdate(action);
        default:
          console.warn('Unknown action type:', action.type);
          return false;
      }
    } catch (error) {
      console.error('Failed to process action:', error);
      return false;
    }
  }, []);

  // Process form submission
  const processFormSubmission = async (action: OfflineAction): Promise<boolean> => {
    if (!action.url || !action.method) {
      console.error('Form submission action missing URL or method');
      return false;
    }

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(action.url!, {
          method: action.method!,
          headers: {
            'Content-Type': 'application/json',
            ...action.data.headers
          },
          body: JSON.stringify(action.data.body)
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      });

      console.log('✅ Form submission processed:', action.id);
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('offline-action-completed', {
        detail: { action, response }
      }));

      return true;
    } catch (error) {
      console.error('Failed to process form submission:', error);
      return false;
    }
  };

  // Process API call
  const processApiCall = async (action: OfflineAction): Promise<boolean> => {
    if (!action.url) {
      console.error('API call action missing URL');
      return false;
    }

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(action.url!, {
          method: action.method || 'GET',
          headers: action.data.headers,
          body: action.data.body ? JSON.stringify(action.data.body) : undefined
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      });

      console.log('✅ API call processed:', action.id);
      return true;
    } catch (error) {
      console.error('Failed to process API call:', error);
      return false;
    }
  };

  // Process user preference update
  const processUserPreference = async (action: OfflineAction): Promise<boolean> => {
    try {
      // User preferences can often be processed immediately
      // since they're stored locally and synced later
      console.log('✅ User preference updated:', action.id);
      return true;
    } catch (error) {
      console.error('Failed to process user preference:', error);
      return false;
    }
  };

  // Process portfolio update
  const processPortfolioUpdate = async (action: OfflineAction): Promise<boolean> => {
    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch('/api/portfolio/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(action.data)
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      });

      console.log('✅ Portfolio update processed:', action.id);
      
      // Trigger portfolio refresh
      window.dispatchEvent(new CustomEvent('portfolio-updated', {
        detail: action.data
      }));

      return true;
    } catch (error) {
      console.error('Failed to process portfolio update:', error);
      return false;
    }
  };

  // Remove specific action from queue
  const removeAction = useCallback((actionId: string) => {
    setQueuedActions(prev => prev.filter(action => action.id !== actionId));
  }, [setQueuedActions]);

  // Clear all queued actions
  const clearQueue = useCallback(() => {
    setQueuedActions([]);
  }, [setQueuedActions]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    return {
      total: queuedActions.length,
      byType: queuedActions.reduce((acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      oldestAction: queuedActions.length > 0 
        ? new Date(Math.min(...queuedActions.map(a => a.timestamp)))
        : null,
      failedActions: queuedActions.filter(a => a.retryCount > 0).length
    };
  }, [queuedActions]);

  return {
    queuedActions,
    isProcessing,
    queueAction,
    processQueuedActions,
    removeAction,
    clearQueue,
    getQueueStats
  };
}

/**
 * Hook for offline-aware form submissions
 */
export function useOfflineForm<T extends Record<string, any>>(
  submitUrl: string,
  options: {
    method?: string;
    onSuccess?: (response: any) => void;
    onError?: (error: Error) => void;
    onQueued?: (actionId: string) => void;
  } = {}
) {
  const { method = 'POST', onSuccess, onError, onQueued } = options;
  const { isOnline } = useNetworkStatus();
  const { queueAction } = useOfflineActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = useCallback(async (formData: T) => {
    setIsSubmitting(true);

    try {
      if (isOnline) {
        // Try immediate submission
        const response = await fetch(submitUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          onSuccess?.(result);
          return result;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } else {
        // Queue for later submission
        const actionId = queueAction({
          type: 'form-submission',
          url: submitUrl,
          method,
          data: {
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          },
          maxRetries: 3
        });

        onQueued?.(actionId);
        return { queued: true, actionId };
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Submission failed');
      onError?.(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, submitUrl, method, queueAction, onSuccess, onError, onQueued]);

  return {
    submitForm,
    isSubmitting,
    isOnline
  };
}

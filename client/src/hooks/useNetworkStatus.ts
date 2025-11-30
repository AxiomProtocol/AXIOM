import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  rtt: number; // Round trip time
  downlink: number; // Download speed estimate
  lastChecked: Date;
}

/**
 * Advanced network status hook with connection quality detection
 * Provides real-time network status and connection quality metrics
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    rtt: 0,
    downlink: 0,
    lastChecked: new Date()
  }));

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Get connection information if available
  const getConnectionInfo = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        rtt: connection?.rtt || 0,
        downlink: connection?.downlink || 0,
        isSlowConnection: connection?.effectiveType === 'slow-2g' || 
                         connection?.effectiveType === '2g' ||
                         (connection?.downlink && connection.downlink < 1.5)
      };
    }
    return {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      rtt: 0,
      downlink: 0,
      isSlowConnection: false
    };
  }, []);

  // Test actual connectivity by making a request
  const testConnectivity = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await fetch('/api/health-check', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      const isActuallyOnline = response.ok;
      
      return {
        isOnline: isActuallyOnline,
        responseTime,
        isSlowConnection: responseTime > 3000 // Consider slow if > 3 seconds
      };
    } catch (error) {
      console.warn('Network connectivity test failed:', error);
      return {
        isOnline: false,
        responseTime: Infinity,
        isSlowConnection: true
      };
    }
  }, []);

  // Update network status
  const updateNetworkStatus = useCallback(async () => {
    const connectionInfo = getConnectionInfo();
    const isBasicallyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    let actualConnectivity = {
      isOnline: isBasicallyOnline,
      responseTime: 0,
      isSlowConnection: connectionInfo.isSlowConnection
    };

    // Only test actual connectivity if we think we're online
    if (isBasicallyOnline) {
      actualConnectivity = await testConnectivity();
    }

    setNetworkStatus({
      isOnline: actualConnectivity.isOnline,
      isSlowConnection: actualConnectivity.isSlowConnection || connectionInfo.isSlowConnection,
      connectionType: connectionInfo.connectionType,
      effectiveType: connectionInfo.effectiveType,
      rtt: connectionInfo.rtt,
      downlink: connectionInfo.downlink,
      lastChecked: new Date()
    });

    return actualConnectivity.isOnline;
  }, [getConnectionInfo, testConnectivity]);

  // Retry mechanism for failed network operations
  const retryWithBackoff = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) => {
    setIsRetrying(true);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        setRetryCount(attempt + 1);
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Network: Back online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('📶 Network: Gone offline');
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        lastChecked: new Date()
      }));
    };

    // Listen for connection changes
    const handleConnectionChange = () => {
      console.log('📶 Network: Connection changed');
      updateNetworkStatus();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Listen for connection quality changes
      if ('connection' in navigator) {
        (navigator as any).connection?.addEventListener('change', handleConnectionChange);
      }

      // Initial status check
      updateNetworkStatus();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        
        if ('connection' in navigator) {
          (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
        }
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [updateNetworkStatus]);

  // Periodic connectivity checks when online
  useEffect(() => {
    if (networkStatus.isOnline) {
      timeoutRef.current = setTimeout(() => {
        updateNetworkStatus();
      }, 30000); // Check every 30 seconds when online
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [networkStatus.isOnline, updateNetworkStatus]);

  return {
    ...networkStatus,
    retryCount,
    isRetrying,
    refreshStatus: updateNetworkStatus,
    retryWithBackoff
  };
}

/**
 * Hook for handling network-dependent operations with automatic retry
 */
export function useNetworkOperation<T>(
  operation: () => Promise<T>,
  options: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    showOfflineMessage?: boolean;
  } = {}
) {
  const { retryOnFailure = true, maxRetries = 3, showOfflineMessage = true } = options;
  const { isOnline, retryWithBackoff } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    if (!isOnline && showOfflineMessage) {
      setError('You appear to be offline. Please check your internet connection.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result: T;
      
      if (retryOnFailure) {
        result = await retryWithBackoff(operation, maxRetries);
      } else {
        result = await operation();
      }
      
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, operation, retryOnFailure, maxRetries, showOfflineMessage, retryWithBackoff]);

  return {
    execute,
    isLoading,
    error,
    data,
    isOnline
  };
}

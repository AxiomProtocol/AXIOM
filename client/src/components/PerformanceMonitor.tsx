import React, { useEffect, useState, useCallback } from 'react';
import { storage, StorageKeys } from '../utils/storage';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // Custom metrics
  pageLoadTime: number | null;
  apiResponseTimes: Record<string, number[]>;
  errorCount: number;
  sessionDuration: number;
  userInteractions: number;
  
  // System info
  connectionType: string;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  
  timestamp: number;
}

interface PerformanceReport {
  sessionId: string;
  metrics: PerformanceMetrics;
  userAgent: string;
  url: string;
  referrer: string;
}

/**
 * Performance monitoring component that tracks Core Web Vitals and custom metrics
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    pageLoadTime: null,
    apiResponseTimes: {},
    errorCount: 0,
    sessionDuration: 0,
    userInteractions: 0,
    connectionType: 'unknown',
    deviceMemory: null,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    timestamp: Date.now()
  });

  const [sessionId] = useState(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Track Core Web Vitals
  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('⚠️ PerformanceObserver not supported');
      return;
    }

    const updateMetric = (name: string, value: number) => {
      setMetrics(prev => ({
        ...prev,
        [name]: value,
        timestamp: Date.now()
      }));
    };

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      updateMetric('lcp', lastEntry.startTime);
    });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        updateMetric('fid', entry.processingStart - entry.startTime);
      });
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          updateMetric('cls', clsValue);
        }
      });
    });

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          updateMetric('fcp', entry.startTime);
        }
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('⚠️ Error setting up performance observers:', error);
    }

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);

  // Track page load time
  useEffect(() => {
    const measurePageLoad = () => {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const ttfb = timing.responseStart - timing.navigationStart;
        
        setMetrics(prev => ({
          ...prev,
          pageLoadTime,
          ttfb,
          timestamp: Date.now()
        }));
      }
    };

    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, []);

  // Track connection info
  useEffect(() => {
    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setMetrics(prev => ({
        ...prev,
        connectionType: connection ? connection.effectiveType || connection.type || 'unknown' : 'unknown',
        deviceMemory: (navigator as any).deviceMemory || null,
        timestamp: Date.now()
      }));
    };

    updateConnectionInfo();

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateConnectionInfo);
      return () => connection.removeEventListener('change', updateConnectionInfo);
    }
  }, []);

  // Track user interactions
  useEffect(() => {
    let interactionCount = 0;
    const sessionStart = Date.now();

    const trackInteraction = () => {
      interactionCount++;
      setMetrics(prev => ({
        ...prev,
        userInteractions: interactionCount,
        sessionDuration: Date.now() - sessionStart,
        timestamp: Date.now()
      }));
    };

    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackInteraction);
      });
    };
  }, []);

  // Track API response times
  const trackApiCall = useCallback((endpoint: string, responseTime: number) => {
    setMetrics(prev => ({
      ...prev,
      apiResponseTimes: {
        ...prev.apiResponseTimes,
        [endpoint]: [...(prev.apiResponseTimes[endpoint] || []), responseTime].slice(-10) // Keep last 10
      },
      timestamp: Date.now()
    }));
  }, []);

  // Track errors
  const trackError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      timestamp: Date.now()
    }));
  }, []);

  // Store metrics periodically
  useEffect(() => {
    const storeMetrics = () => {
      const existingMetrics = storage.getItem(StorageKeys.PERFORMANCE_METRICS, { fallback: { sessions: [] } });
      const updatedMetrics = {
        ...existingMetrics,
        sessions: [...(existingMetrics.sessions || []), {
          sessionId,
          metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: Date.now()
        }].slice(-50) // Keep last 50 sessions
      };
      
      storage.setItem(StorageKeys.PERFORMANCE_METRICS, updatedMetrics);
    };

    const interval = setInterval(storeMetrics, 30000); // Store every 30 seconds
    
    // Store on page unload
    const handleUnload = () => {
      storeMetrics();
    };

    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      storeMetrics(); // Final store
    };
  }, [metrics, sessionId]);

  // Report to analytics service (if configured)
  const reportMetrics = useCallback(async () => {
    try {
      if (process.env.NODE_ENV !== 'production') return;

      const report: PerformanceReport = {
        sessionId,
        metrics,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      };

      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {
        // Silent fail for analytics
        console.log('📊 Performance metrics stored locally');
      });
    } catch (error) {
      console.warn('⚠️ Failed to report performance metrics:', error);
    }
  }, [metrics, sessionId]);

  // Report metrics periodically
  useEffect(() => {
    const interval = setInterval(reportMetrics, 60000); // Report every minute
    return () => clearInterval(interval);
  }, [reportMetrics]);

  // Expose tracking functions globally for use in other components
  useEffect(() => {
    (window as any).SWFPerformance = {
      trackApiCall,
      trackError,
      getMetrics: () => metrics,
      exportData: () => storage.getItem(StorageKeys.PERFORMANCE_METRICS, { fallback: {} })
    };

    return () => {
      delete (window as any).SWFPerformance;
    };
  }, [trackApiCall, trackError, metrics]);

  // Don't render anything - this is a monitoring component
  return null;
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const trackApiCall = useCallback((endpoint: string, responseTime: number) => {
    (window as any).SWFPerformance?.trackApiCall(endpoint, responseTime);
  }, []);

  const trackError = useCallback(() => {
    (window as any).SWFPerformance?.trackError();
  }, []);

  const getMetrics = useCallback(() => {
    return (window as any).SWFPerformance?.getMetrics() || null;
  }, []);

  return { trackApiCall, trackError, getMetrics };
}

/**
 * HOC for automatic API call tracking
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall(...args);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      (window as any).SWFPerformance?.trackApiCall(endpoint, responseTime);
      
      return result;
    } catch (error) {
      (window as any).SWFPerformance?.trackError();
      throw error;
    }
  }) as T;
}

/**
 * Performance metrics display component (for development)
 */
export function PerformanceMetricsDisplay() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      const current = (window as any).SWFPerformance?.getMetrics();
      if (current) {
        setMetrics(current);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white text-xs px-2 py-1 rounded"
        title="Performance Metrics"
      >
        📊
      </button>
      
      {isVisible && (
        <div className="fixed bottom-12 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm text-xs">
          <h3 className="font-bold mb-2">Performance Metrics</h3>
          <div className="space-y-1">
            <div>LCP: {metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'Measuring...'}</div>
            <div>FID: {metrics.fid ? `${Math.round(metrics.fid)}ms` : 'Waiting...'}</div>
            <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'Measuring...'}</div>
            <div>FCP: {metrics.fcp ? `${Math.round(metrics.fcp)}ms` : 'Measuring...'}</div>
            <div>Load: {metrics.pageLoadTime ? `${Math.round(metrics.pageLoadTime)}ms` : 'Loading...'}</div>
            <div>Interactions: {metrics.userInteractions}</div>
            <div>Errors: {metrics.errorCount}</div>
            <div>Connection: {metrics.connectionType}</div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="mt-2 text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}

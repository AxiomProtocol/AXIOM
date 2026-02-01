import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface PlatformStats {
  totalUsers: number;
  activeWallets: number;
  totalVolume?: string;
  systemUptime?: string;
  lastUpdated: Date;
}

interface StatsContextType {
  stats: PlatformStats;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  lastFetch: Date | null;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

interface StatsProviderProps {
  children: React.ReactNode;
}

// Configuration for intelligent caching
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const RETRY_INTERVALS = [1000, 2000, 4000, 8000]; // Exponential backoff
const MAX_RETRIES = 3;

export const StatsProvider: React.FC<StatsProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeWallets: 0,
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  // Refs for managing requests and visibility
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  
  // Request deduplication: prevent multiple simultaneous calls
  const isRequestInProgress = useRef<boolean>(false);

  // Check if data is still fresh (within cache duration)
  const isDataFresh = useCallback((): boolean => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch.getTime() < CACHE_DURATION;
  }, [lastFetch]);

  // Main fetch function with caching, deduplication, and error handling
  const fetchStats = useCallback(async (force: boolean = false): Promise<void> => {
    // Don't fetch if data is fresh and not forced
    if (!force && isDataFresh()) {
      console.log('📊 Using cached stats data');
      return;
    }

    // Prevent duplicate requests
    if (isRequestInProgress.current && !force) {
      console.log('📊 Stats request already in progress, skipping');
      return;
    }

    // Don't fetch if tab is not visible (unless forced)
    if (!isVisibleRef.current && !force) {
      console.log('📊 Tab not visible, skipping stats fetch');
      return;
    }

    try {
      isRequestInProgress.current = true;
      setLoading(true);
      setError(null);

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };

      // Add conditional request headers for caching
      if (lastFetch && !force) {
        headers['If-Modified-Since'] = lastFetch.toUTCString();
      }

      const response = await fetch(`/api/platform-stats?t=${Date.now()}`, {
        headers,
        signal: abortControllerRef.current.signal,
        cache: 'no-cache' // Let our logic handle caching
      });

      // Handle 304 Not Modified - data hasn't changed
      if (response.status === 304) {
        console.log('📊 Stats data unchanged (304)');
        setLastFetch(new Date());
        retryCountRef.current = 0;
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const updatedStats: PlatformStats = {
        totalUsers: data.totalUsers || 0,
        activeWallets: data.activeWallets || 0,
        totalVolume: data.totalVolume,
        systemUptime: data.systemUptime,
        lastUpdated: new Date()
      };

      setStats(updatedStats);
      setLastFetch(new Date());
      retryCountRef.current = 0;

      console.log('📊 Stats fetched successfully:', { 
        totalUsers: updatedStats.totalUsers, 
        activeWallets: updatedStats.activeWallets,
        cached: false
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('📊 Stats request aborted');
        return;
      }

      console.error('📊 Error fetching stats:', err);
      setError('Failed to load platform statistics');

      // Implement exponential backoff for retries
      if (retryCountRef.current < MAX_RETRIES) {
        const retryDelay = RETRY_INTERVALS[retryCountRef.current] || RETRY_INTERVALS[RETRY_INTERVALS.length - 1];
        retryCountRef.current++;
        
        console.log(`📊 Retrying stats fetch in ${retryDelay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          fetchStats(force);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [isDataFresh, lastFetch]);

  // Public refresh function
  const refreshStats = useCallback(async (): Promise<void> => {
    await fetchStats(true);
  }, [fetchStats]);

  // Set up visibility change listener to pause/resume updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (isVisibleRef.current) {
        console.log('📊 Tab became visible, checking if stats need refresh');
        // When tab becomes visible, fetch if data is stale
        if (!isDataFresh()) {
          fetchStats();
        }
      } else {
        console.log('📊 Tab became hidden, pausing stats updates');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStats, isDataFresh]);

  // Set up periodic refresh with intelligent scheduling
  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up periodic refresh
    const scheduleNextRefresh = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only schedule if tab is visible or data is very stale
      const shouldSchedule = isVisibleRef.current || !isDataFresh();
      
      if (shouldSchedule) {
        timeoutRef.current = setTimeout(() => {
          fetchStats().then(() => {
            scheduleNextRefresh(); // Schedule next refresh after current one completes
          });
        }, CACHE_DURATION);
      }
    };

    scheduleNextRefresh();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats, isDataFresh]);

  const contextValue: StatsContextType = {
    stats,
    loading,
    error,
    refreshStats,
    lastFetch
  };

  return (
    <StatsContext.Provider value={contextValue}>
      {children}
    </StatsContext.Provider>
  );
};

// Custom hook to use stats context
export const useStats = (): StatsContextType => {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};

// HOC for components that need stats
export const withStats = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <StatsProvider>
      <Component {...props} />
    </StatsProvider>
  );
};

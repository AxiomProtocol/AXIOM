import { useEffect, useCallback, useRef, useState } from 'react';
import { useAccessibility } from './useAccessibility';

/**
 * Intersection Observer hook for lazy loading and animations
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
  triggerOnce: boolean = true
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry.isIntersecting;
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting && !hasIntersected) {
          setHasIntersected(true);
          
          if (triggerOnce) {
            observer.unobserve(target);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(target);
    observerRef.current = observer;

    return () => {
      observer.unobserve(target);
    };
  }, [options, triggerOnce, hasIntersected]);

  return {
    targetRef,
    isIntersecting,
    hasIntersected,
    shouldAnimate: hasIntersected && !reduceMotion
  };
}

/**
 * Lazy loading hook for images and components
 */
export function useLazyLoading<T extends HTMLElement>(threshold: number = 0.1) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<T | null>(null);

  const { isIntersecting } = useIntersectionObserver(
    { threshold },
    true
  );

  const loadContent = useCallback(async (loadFn: () => Promise<void>) => {
    if (isLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await loadFn();
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Loading failed'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isLoading]);

  useEffect(() => {
    if (isIntersecting && !isLoaded && !isLoading) {
      // Auto-trigger loading when element becomes visible
      // The actual loading function should be provided by the component
    }
  }, [isIntersecting, isLoaded, isLoading]);

  return {
    elementRef,
    isLoaded,
    isLoading,
    error,
    shouldLoad: isIntersecting,
    loadContent
  };
}

/**
 * Image lazy loading with placeholder and error handling
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { shouldLoad } = useLazyLoading<HTMLImageElement>();

  useEffect(() => {
    if (!shouldLoad || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setError(false);
    };
    
    img.onerror = () => {
      setError(true);
      setIsLoaded(false);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [shouldLoad, src]);

  return {
    imgRef,
    src: imageSrc,
    isLoaded,
    error
  };
}

/**
 * Resource preloading hook
 */
export function useResourcePreloader() {
  const preloadedResources = useRef(new Set<string>());

  const preloadImage = useCallback((src: string): Promise<void> => {
    if (preloadedResources.current.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        preloadedResources.current.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const preloadFont = useCallback((fontFamily: string, src: string): Promise<void> => {
    if (preloadedResources.current.has(src)) {
      return Promise.resolve();
    }

    const font = new FontFace(fontFamily, `url(${src})`);
    
    return font.load().then(() => {
      document.fonts.add(font);
      preloadedResources.current.add(src);
    });
  }, []);

  const preloadScript = useCallback((src: string): Promise<void> => {
    if (preloadedResources.current.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.onload = () => {
        preloadedResources.current.add(src);
        resolve();
      };
      script.onerror = reject;
      script.src = src;
      document.head.appendChild(script);
    });
  }, []);

  const preloadCSS = useCallback((href: string): Promise<void> => {
    if (preloadedResources.current.has(href)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.onload = () => {
        preloadedResources.current.add(href);
        resolve();
      };
      link.onerror = reject;
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  return {
    preloadImage,
    preloadFont,
    preloadScript,
    preloadCSS,
    isPreloaded: (src: string) => preloadedResources.current.has(src)
  };
}

/**
 * Memory leak prevention and cleanup
 */
export function useMemoryManagement() {
  const timeouts = useRef(new Set<number>());
  const intervals = useRef(new Set<number>());
  const listeners = useRef(new Map<string, { element: EventTarget; listener: EventListener }>());
  const observers = useRef(new Set<IntersectionObserver | MutationObserver | ResizeObserver>());

  // Safe timeout creation
  const createTimeout = useCallback((callback: () => void, delay: number): number => {
    const timeout = setTimeout(() => {
      callback();
      timeouts.current.delete(timeout);
    }, delay);
    
    timeouts.current.add(timeout);
    return timeout;
  }, []);

  // Safe interval creation
  const createInterval = useCallback((callback: () => void, delay: number): number => {
    const interval = setInterval(callback, delay);
    intervals.current.add(interval);
    return interval;
  }, []);

  // Safe event listener addition
  const addEventListener = useCallback((
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    element.addEventListener(event, listener, options);
    listeners.current.set(`${event}_${Date.now()}`, { element, listener });
  }, []);

  // Safe observer creation
  const createObserver = useCallback(<T extends IntersectionObserver | MutationObserver | ResizeObserver>(
    observer: T
  ): T => {
    observers.current.add(observer);
    return observer;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear timeouts
    timeouts.current.forEach(timeout => clearTimeout(timeout));
    timeouts.current.clear();

    // Clear intervals
    intervals.current.forEach(interval => clearInterval(interval));
    intervals.current.clear();

    // Remove event listeners
    listeners.current.forEach(({ element, listener }, key) => {
      const event = key.split('_')[0];
      element.removeEventListener(event, listener);
    });
    listeners.current.clear();

    // Disconnect observers
    observers.current.forEach(observer => observer.disconnect());
    observers.current.clear();
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    createTimeout,
    createInterval,
    addEventListener,
    createObserver,
    cleanup
  };
}

/**
 * Performance monitoring and optimization hints
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    navigationTiming?: PerformanceNavigationTiming;
    paintTiming?: PerformancePaintTiming[];
    resourceTiming?: PerformanceResourceTiming[];
    memoryInfo?: any;
  }>({});

  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint') as PerformancePaintTiming[];
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const memory = (performance as any).memory;

      setMetrics({
        navigationTiming: navigation,
        paintTiming: paint,
        resourceTiming: resources,
        memoryInfo: memory
      });

      // Generate optimization suggestions
      const newSuggestions: string[] = [];

      if (navigation.loadEventEnd - navigation.fetchStart > 3000) {
        newSuggestions.push('Consider implementing code splitting to reduce initial bundle size');
      }

      if (paint.find(p => p.name === 'first-contentful-paint')?.startTime > 1500) {
        newSuggestions.push('First Contentful Paint is slow - optimize critical rendering path');
      }

      const largeResources = resources.filter(r => r.transferSize > 100000);
      if (largeResources.length > 0) {
        newSuggestions.push(`${largeResources.length} large resources detected - consider compression or lazy loading`);
      }

      if (memory && memory.usedJSHeapSize > 50000000) { // 50MB
        newSuggestions.push('High memory usage detected - check for potential memory leaks');
      }

      setSuggestions(newSuggestions);
    };

    // Initial measurement
    if (document.readyState === 'complete') {
      updateMetrics();
    } else {
      window.addEventListener('load', updateMetrics);
    }

    return () => window.removeEventListener('load', updateMetrics);
  }, []);

  const markFeature = useCallback((name: string) => {
    performance.mark(`feature-${name}-start`);
    
    return () => {
      performance.mark(`feature-${name}-end`);
      performance.measure(`feature-${name}`, `feature-${name}-start`, `feature-${name}-end`);
    };
  }, []);

  const measureRender = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // Slower than 60fps
        console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, []);

  return {
    metrics,
    suggestions,
    markFeature,
    measureRender
  };
}

/**
 * Virtual scrolling for large lists
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index
  }));

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    totalHeight,
    visibleItems,
    startIndex,
    offsetY: startIndex * itemHeight,
    handleScroll
  };
}

/**
 * Code splitting and dynamic imports
 */
export function useDynamicImport<T>(importFn: () => Promise<{ default: T }>) {
  const [component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (component || loading) return;

    setLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(module.default);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Import failed'));
    } finally {
      setLoading(false);
    }
  }, [component, loading, importFn]);

  return {
    component,
    loading,
    error,
    loadComponent
  };
}

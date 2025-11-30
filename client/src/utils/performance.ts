/**
 * Advanced Performance Optimization Utilities for SWF Platform
 * Includes smart prefetching, image optimization, debouncing, and virtual scrolling
 */

import React, { useState, useEffect, useMemo } from 'react';

// Performance monitoring utilities
export interface PerformanceMetrics {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  pageLoadTime: number;
  apiResponseTimes: Record<string, number>;
  errorCount: number;
  sessionDuration: number;
  userInteractions: number;
}

// Global performance state
let performanceData: PerformanceMetrics = {
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null,
  pageLoadTime: 0,
  apiResponseTimes: {},
  errorCount: 0,
  sessionDuration: 0,
  userInteractions: 0
};

/**
 * Smart Request Debouncing with Priority Queue
 */
class SmartDebouncer {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private priorities: Map<string, 'high' | 'medium' | 'low'> = new Map();
  
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // Clear existing timeout
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Store priority
      this.priorities.set(key, priority);

      // Adjust delay based on priority
      const adjustedDelay = priority === 'high' ? delay * 0.5 : 
                          priority === 'medium' ? delay : 
                          delay * 1.5;

      // Set new timeout
      const timeout = setTimeout(() => {
        fn(...args);
        this.timeouts.delete(key);
        this.priorities.delete(key);
      }, adjustedDelay);

      this.timeouts.set(key, timeout);
    };
  }

  // Immediately execute high priority debounced functions
  flush(priority?: 'high' | 'medium' | 'low') {
    this.timeouts.forEach((timeout, key) => {
      const functionPriority = this.priorities.get(key);
      if (!priority || functionPriority === priority) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
        this.priorities.delete(key);
      }
    });
  }

  // Cancel all pending debounced functions
  cancelAll() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.priorities.clear();
  }
}

export const debouncer = new SmartDebouncer();

/**
 * Smart Image Loading with Optimization
 */
export class SmartImageLoader {
  private static observerMap = new Map<HTMLImageElement, IntersectionObserver>();
  private static loadingImages = new Set<string>();

  static load(
    imgElement: HTMLImageElement,
    src: string,
    options: {
      quality?: number;
      format?: 'webp' | 'avif' | 'auto';
      sizes?: string;
      placeholder?: string;
      lazy?: boolean;
    } = {}
  ) {
    const {
      quality = 85,
      format = 'auto',
      sizes,
      placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iMTIiPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
      lazy = true
    } = options;

    // Set placeholder initially
    imgElement.src = placeholder;
    imgElement.style.filter = 'blur(5px)';
    imgElement.style.transition = 'filter 0.3s ease';

    // Optimize URL based on device capabilities
    const optimizedSrc = this.optimizeImageUrl(src, {
      quality,
      format,
      devicePixelRatio: window.devicePixelRatio,
      viewportWidth: window.innerWidth
    });

    if (lazy) {
      this.setupLazyLoading(imgElement, optimizedSrc);
    } else {
      this.loadImage(imgElement, optimizedSrc);
    }
  }

  private static setupLazyLoading(imgElement: HTMLImageElement, src: string) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement, src);
            observer.unobserve(entry.target);
            this.observerMap.delete(entry.target as HTMLImageElement);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    );

    observer.observe(imgElement);
    this.observerMap.set(imgElement, observer);
  }

  private static async loadImage(imgElement: HTMLImageElement, src: string) {
    if (this.loadingImages.has(src)) {
      return; // Already loading this image
    }

    this.loadingImages.add(src);

    try {
      // Create new image to preload
      const tempImg = new Image();
      
      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
        tempImg.src = src;
      });

      // Update the actual image
      imgElement.src = src;
      imgElement.style.filter = 'none';
      
      // Dispatch load event
      imgElement.dispatchEvent(new CustomEvent('smart-image-loaded', {
        detail: { src, loadTime: performance.now() }
      }));

    } catch (error) {
      console.warn('Smart image loading failed:', error);
      // Keep placeholder on error
      imgElement.dispatchEvent(new CustomEvent('smart-image-error', {
        detail: { src, error }
      }));
    } finally {
      this.loadingImages.delete(src);
    }
  }

  private static optimizeImageUrl(
    src: string,
    options: {
      quality: number;
      format: string;
      devicePixelRatio: number;
      viewportWidth: number;
    }
  ): string {
    // If it's an external URL, return as-is
    if (src.startsWith('http') && !src.includes(window.location.host)) {
      return src;
    }

    const { quality, format, devicePixelRatio, viewportWidth } = options;
    
    // Determine optimal width based on viewport and DPR
    const optimalWidth = Math.min(
      Math.ceil(viewportWidth * devicePixelRatio),
      2048 // Max width to prevent huge images
    );

    // Build optimization query parameters
    const params = new URLSearchParams();
    params.set('w', optimalWidth.toString());
    params.set('q', quality.toString());
    
    if (format === 'auto') {
      // Auto-detect best format based on browser support
      if (this.supportsFormat('avif')) {
        params.set('fm', 'avif');
      } else if (this.supportsFormat('webp')) {
        params.set('fm', 'webp');
      }
    } else {
      params.set('fm', format);
    }

    // Add parameters to URL
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}${params.toString()}`;
  }

  private static supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).startsWith(`data:image/${format}`);
    } catch {
      return false;
    }
  }

  static cleanup() {
    // Clean up observers when component unmounts
    this.observerMap.forEach(observer => observer.disconnect());
    this.observerMap.clear();
    this.loadingImages.clear();
  }
}

/**
 * Smart Prefetching System
 */
export class SmartPrefetcher {
  private static prefetchQueue: string[] = [];
  private static prefetchedUrls = new Set<string>();
  private static isPrefetching = false;

  // Prefetch URLs based on user behavior patterns
  static prefetchUrl(url: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.prefetchedUrls.has(url)) {
      return; // Already prefetched
    }

    // Add to queue based on priority
    if (priority === 'high') {
      this.prefetchQueue.unshift(url);
    } else {
      this.prefetchQueue.push(url);
    }

    this.processPrefetchQueue();
  }

  // Prefetch based on mouse hover (user intent prediction)
  static setupHoverPrefetch() {
    let hoverTimeout: NodeJS.Timeout;

    document.addEventListener('mouseover', (event) => {
      const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.isInternalLink(link.href)) {
        // Clear existing timeout
        clearTimeout(hoverTimeout);
        
        // Prefetch after 200ms of hover (indicates intent)
        hoverTimeout = setTimeout(() => {
          this.prefetchUrl(link.href, 'high');
        }, 200);
      }
    });

    document.addEventListener('mouseout', () => {
      clearTimeout(hoverTimeout);
    });
  }

  // Prefetch based on user interaction patterns
  static setupIntelligentPrefetch(userInteractionData: { visitedPages: string[]; commonPaths: string[] }) {
    // Prefetch commonly visited pages
    userInteractionData.commonPaths.forEach(path => {
      this.prefetchUrl(path, 'medium');
    });

    // Prefetch next logical pages based on current page
    const currentPath = window.location.pathname;
    const nextPages = this.predictNextPages(currentPath, userInteractionData.visitedPages);
    
    nextPages.forEach(page => {
      this.prefetchUrl(page, 'low');
    });
  }

  private static async processPrefetchQueue() {
    if (this.isPrefetching || this.prefetchQueue.length === 0) {
      return;
    }

    // Only prefetch when browser is idle and on fast connection
    if (!this.isOptimalForPrefetch()) {
      return;
    }

    this.isPrefetching = true;
    const url = this.prefetchQueue.shift()!;

    try {
      const response = await fetch(url, {
        mode: 'no-cors',
        priority: 'low'
      } as RequestInit);
      
      this.prefetchedUrls.add(url);
      console.log(`🚀 Prefetched: ${url}`);
      
    } catch (error) {
      console.warn(`⚠️ Prefetch failed for ${url}:`, error);
    } finally {
      this.isPrefetching = false;
      
      // Process next item after a delay
      setTimeout(() => this.processPrefetchQueue(), 100);
    }
  }

  private static isOptimalForPrefetch(): boolean {
    // Check connection quality
    const connection = (navigator as any).connection;
    if (connection) {
      // Don't prefetch on slow connections
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return false;
      }
      
      // Don't prefetch if data saver is enabled
      if (connection.saveData) {
        return false;
      }
    }

    // Check if browser is idle
    if (document.hidden) {
      return false;
    }

    // Check CPU usage (basic heuristic)
    const now = performance.now();
    const lastFrameTime = (performance as any).lastFrameTime || now;
    (performance as any).lastFrameTime = now;
    
    // If frame time is > 16ms, CPU might be busy
    return (now - lastFrameTime) < 20;
  }

  private static isInternalLink(url: string): boolean {
    try {
      const linkUrl = new URL(url, window.location.href);
      return linkUrl.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  private static predictNextPages(currentPath: string, visitedPages: string[]): string[] {
    // Simple prediction algorithm based on common patterns
    const predictions: string[] = [];

    // Dashboard workflow predictions
    if (currentPath === '/') {
      predictions.push('/dashboard', '/enhanced-staking', '/learn-how-it-works');
    } else if (currentPath === '/dashboard') {
      predictions.push('/enhanced-staking', '/airdrop', '/swf-banking');
    } else if (currentPath === '/enhanced-staking') {
      predictions.push('/dashboard', '/liquidity-management');
    }

    // Filter out already visited pages (less priority)
    return predictions.filter(page => !visitedPages.includes(page));
  }
}

/**
 * Virtual Scrolling for Large Data Sets
 */
export class VirtualScrollManager {
  private container: HTMLElement;
  private items: any[];
  private itemHeight: number;
  private visibleCount: number;
  private scrollTop: number = 0;
  private renderCallback: (items: any[], startIndex: number) => void;

  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderCallback: (items: any[], startIndex: number) => void
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.renderCallback = renderCallback;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2; // Buffer items

    this.setupScrollListener();
    this.render();
  }

  private setupScrollListener() {
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop;
      this.render();
    });
  }

  private render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount, this.items.length);
    
    const visibleItems = this.items.slice(startIndex, endIndex);
    
    // Update container height to maintain scroll position
    const totalHeight = this.items.length * this.itemHeight;
    const offsetY = startIndex * this.itemHeight;
    
    // Set container styles for virtual scrolling
    this.container.style.height = `${totalHeight}px`;
    this.container.style.paddingTop = `${offsetY}px`;
    
    this.renderCallback(visibleItems, startIndex);
  }

  updateItems(newItems: any[]) {
    this.items = newItems;
    this.render();
  }

  scrollToIndex(index: number) {
    const scrollTop = index * this.itemHeight;
    this.container.scrollTop = scrollTop;
  }
}

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private static observers: PerformanceObserver[] = [];
  private static startTime = performance.now();

  static init() {
    this.monitorWebVitals();
    this.monitorApiCalls();
    this.monitorUserInteractions();
    this.setupPeriodicReporting();
  }

  private static monitorWebVitals() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP - Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        performanceData.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // FID - First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          performanceData.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // CLS - Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            performanceData.cls = (performanceData.cls || 0) + entry.value;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }

    // Navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      performanceData.fcp = navigation.responseStart - navigation.fetchStart;
      performanceData.ttfb = navigation.responseStart - navigation.requestStart;
      performanceData.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
    });
  }

  private static monitorApiCalls() {
    // Intercept fetch calls to monitor API performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        // Store API response time
        if (url.includes('/api/')) {
          const apiPath = new URL(url, window.location.href).pathname;
          performanceData.apiResponseTimes[apiPath] = duration;
        }
        
        return response;
      } catch (error) {
        performanceData.errorCount++;
        throw error;
      }
    };
  }

  private static monitorUserInteractions() {
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        performanceData.userInteractions++;
      }, { passive: true });
    });
  }

  private static setupPeriodicReporting() {
    setInterval(() => {
      performanceData.sessionDuration = performance.now() - this.startTime;
      
      // Send performance data to analytics endpoint
      this.reportPerformanceData();
    }, 30000); // Report every 30 seconds
  }

  private static async reportPerformanceData() {
    try {
      const deviceInfo = {
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        deviceMemory: (navigator as any).deviceMemory || 0,
        hardwareConcurrency: navigator.hardwareConcurrency || 0
      };

      const payload = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        metrics: {
          ...performanceData,
          ...deviceInfo,
          timestamp: Date.now()
        }
      };

      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });

    } catch (error) {
      console.warn('Performance reporting failed:', error);
    }
  }

  static getMetrics(): PerformanceMetrics {
    return { ...performanceData };
  }

  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * React Hooks for Performance Optimizations
 */
export function useSmartDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  priority: 'high' | 'medium' | 'low' = 'medium'
): (...args: Parameters<T>) => void {
  const key = `hook-${Math.random().toString(36).substr(2, 9)}`;
  return debouncer.debounce(key, callback, delay, priority);
}

export function useVirtualScroll<T>(
  items: T[],
  containerRef: React.RefObject<HTMLElement>,
  itemHeight: number,
  renderItem: (item: T, index: number) => React.ReactNode
) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new VirtualScrollManager(
      containerRef.current,
      items,
      itemHeight,
      (items, startIdx) => {
        setVisibleItems(items);
        setStartIndex(startIdx);
      }
    );

    return () => manager.updateItems([]);
  }, [items, itemHeight, containerRef]);

  return {
    visibleItems,
    startIndex,
    renderVisibleItems: () => visibleItems.map((item, index) => 
      renderItem(item, startIndex + index)
    )
  };
}

// Initialize performance monitoring when module loads
if (typeof window !== 'undefined') {
  PerformanceMonitor.init();
  SmartPrefetcher.setupHoverPrefetch();
}

export default {
  debouncer,
  SmartImageLoader,
  SmartPrefetcher,
  VirtualScrollManager,
  PerformanceMonitor,
  useSmartDebounce,
  useVirtualScroll
};

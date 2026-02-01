import { useState, useEffect, useCallback, useRef } from 'react';
import { useHapticFeedback } from './useEnhancedInteractions';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Pull-to-refresh functionality hook
 */
export function usePullToRefresh(onRefresh: () => Promise<void>, options: {
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
} = {}) {
  const { threshold = 80, resistance = 0.5, enabled = true } = options;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { triggerHaptic } = useHapticFeedback();
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 0) return; // Only allow at top of page
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !enabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff * resistance, threshold * 1.5);
      setPullDistance(distance);
      
      // Haptic feedback when reaching threshold
      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic('selection');
      }
    }
  }, [enabled, isRefreshing, resistance, threshold, pullDistance, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || !enabled) return;
    
    isDragging.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('impact');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [enabled, pullDistance, threshold, isRefreshing, onRefresh, triggerHaptic]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
    canRefresh: pullDistance >= threshold
  };
}

/**
 * Touch gestures for chart interactions
 */
export function useChartGestures(onPinch?: (scale: number) => void, onPan?: (deltaX: number, deltaY: number) => void) {
  const [isGesturing, setIsGesturing] = useState(false);
  const lastTouches = useRef<TouchList | null>(null);
  const lastDistance = useRef(0);
  const { triggerHaptic } = useHapticFeedback();

  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      setIsGesturing(true);
      lastDistance.current = getDistance(e.touches);
      triggerHaptic('light');
    }
    lastTouches.current = e.touches;
  }, [getDistance, triggerHaptic]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isGesturing || !lastTouches.current) return;

    if (e.touches.length === 2 && onPinch) {
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / lastDistance.current;
      
      if (Math.abs(scale - 1) > 0.1) { // Threshold to prevent jittery updates
        onPinch(scale);
        lastDistance.current = currentDistance;
      }
    } else if (e.touches.length === 1 && lastTouches.current.length === 1 && onPan) {
      const deltaX = e.touches[0].clientX - lastTouches.current[0].clientX;
      const deltaY = e.touches[0].clientY - lastTouches.current[0].clientY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) { // Threshold for sensitivity
        onPan(deltaX, deltaY);
      }
    }
    
    lastTouches.current = e.touches;
  }, [isGesturing, onPinch, onPan, getDistance]);

  const handleTouchEnd = useCallback(() => {
    setIsGesturing(false);
    lastTouches.current = null;
    lastDistance.current = 0;
  }, []);

  return {
    isGesturing,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

/**
 * Swipe navigation hook
 */
export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  options: {
    threshold?: number;
    velocity?: number;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 50, velocity = 0.3, enabled = true } = options;
  const { triggerHaptic } = useHapticFeedback();
  
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isSwipe = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    isSwipe.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - startX.current);
    const diffY = Math.abs(currentY - startY.current);
    
    // Determine if this is a horizontal swipe
    if (diffX > diffY && diffX > 20) {
      isSwipe.current = true;
      e.preventDefault(); // Prevent scrolling
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwipe.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endTime = Date.now();
    const diffX = endX - startX.current;
    const diffTime = endTime - startTime.current;
    const swipeVelocity = Math.abs(diffX) / diffTime;
    
    if (Math.abs(diffX) >= threshold && swipeVelocity >= velocity) {
      triggerHaptic('medium');
      
      if (diffX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  }, [enabled, threshold, velocity, onSwipeLeft, onSwipeRight, triggerHaptic]);

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

/**
 * Enhanced mobile viewport management
 */
export function useMobileViewport() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateViewport = () => {
      const height = window.innerHeight;
      const previousHeight = viewportHeight;
      
      // Detect keyboard open/close (significant height change on mobile)
      const heightDiff = Math.abs(height - previousHeight);
      const isSignificantChange = heightDiff > 150;
      
      if (isSignificantChange) {
        setIsKeyboardOpen(height < previousHeight);
      }
      
      setViewportHeight(height);
      
      // Update CSS custom property for full height
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    const updateOrientation = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setOrientation(newOrientation);
      
      // Small delay to ensure viewport has updated after orientation change
      setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateOrientation);
    
    // Initial setup
    updateViewport();
    updateOrientation();

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, [viewportHeight]);

  return {
    viewportHeight,
    isKeyboardOpen,
    orientation,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  };
}

/**
 * Long press gesture hook
 */
export function useLongPress(
  onLongPress: () => void,
  options: {
    delay?: number;
    enabled?: boolean;
  } = {}
) {
  const { delay = 500, enabled = true } = options;
  const { triggerHaptic } = useHapticFeedback();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const startLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    isLongPress.current = false;
    
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerHaptic('medium');
      onLongPress();
    }, delay);
  }, [enabled, delay, onLongPress, triggerHaptic]);

  const clearLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    onMouseDown: startLongPress,
    onMouseUp: clearLongPress,
    onMouseLeave: clearLongPress,
    onTouchStart: startLongPress,
    onTouchEnd: clearLongPress,
    onClick: handleClick
  };
}

/**
 * Mobile-specific performance optimizations
 */
export function useMobilePerformance() {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [shouldReduceAnimations, setShouldReduceAnimations] = useState(false);

  useEffect(() => {
    // Detect low-end devices
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    
    const isLowEnd = hardwareConcurrency <= 2 || 
                     deviceMemory <= 2 || 
                     (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'));
    
    setIsLowEndDevice(isLowEnd);
    
    // Respect user's reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setShouldReduceAnimations(isLowEnd || prefersReducedMotion);
    
    // Apply performance optimizations
    if (isLowEnd) {
      document.documentElement.classList.add('low-end-device');
    }
    
    if (prefersReducedMotion || isLowEnd) {
      document.documentElement.classList.add('reduce-motion');
    }
  }, []);

  return {
    isLowEndDevice,
    shouldReduceAnimations,
    optimizationLevel: isLowEndDevice ? 'high' : 'normal' as 'high' | 'normal'
  };
}

/**
 * Touch-friendly button enhancements
 */
export function useTouchButton(onClick: () => void) {
  const { triggerHaptic } = useHapticFeedback();
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    onClick();
  }, [onClick]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
  }, []);

  return {
    isPressed,
    touchProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      style: {
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.1s ease'
      }
    }
  };
}

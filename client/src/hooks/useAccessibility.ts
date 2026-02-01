import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserPreferences } from './useLocalStorage';

/**
 * Accessibility preferences and utilities hook
 */
export function useAccessibility() {
  const [preferences] = useUserPreferences();
  const [focusVisible, setFocusVisible] = useState(false);
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // Detect if user is navigating with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Apply accessibility preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Reduced motion
    if (preferences.accessibility.reduceMotion) {
      root.style.setProperty('--motion-reduce', '0');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--motion-reduce');
      root.classList.remove('reduce-motion');
    }

    // High contrast
    if (preferences.accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    switch (preferences.accessibility.fontSize) {
      case 'small':
        root.style.setProperty('--font-scale', '0.875');
        break;
      case 'large':
        root.style.setProperty('--font-scale', '1.125');
        break;
      default:
        root.style.setProperty('--font-scale', '1');
    }
  }, [preferences.accessibility]);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) {
      // Create announcement element if it doesn't exist
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
      announcementRef.current = announcer;
    }

    // Clear previous message
    announcementRef.current.textContent = '';
    
    // Announce new message after a brief delay
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    }, 100);
  }, []);

  // Skip link functionality
  const addSkipLink = useCallback((targetId: string, label: string = 'Skip to main content') => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.3s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
    return skipLink;
  }, []);

  return {
    focusVisible,
    announce,
    addSkipLink,
    preferences: preferences.accessibility,
    reduceMotion: preferences.accessibility.reduceMotion,
    highContrast: preferences.accessibility.highContrast,
    fontSize: preferences.accessibility.fontSize
  };
}

/**
 * Focus management hook for modals and complex components
 */
export function useFocusManagement(isActive: boolean, autoFocus: boolean = true) {
  const previousActiveElement = useRef<Element | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Store and restore focus
  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement;
      
      if (autoFocus && containerRef.current) {
        // Focus first focusable element
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    } else {
      // Restore focus when component becomes inactive
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }
  }, [isActive, autoFocus]);

  // Trap focus within container
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!isActive || !containerRef.current || e.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }, [isActive]);

  // Set up event listeners
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', trapFocus);
      return () => document.removeEventListener('keydown', trapFocus);
    }
  }, [isActive, trapFocus]);

  return containerRef;
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): Element[] {
  const focusableSelector = [
    'button:not([disabled])',
    '[href]:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelector)).filter(
    element => {
      const computedStyle = window.getComputedStyle(element);
      return (
        computedStyle.display !== 'none' &&
        computedStyle.visibility !== 'hidden' &&
        computedStyle.opacity !== '0'
      );
    }
  );
}

/**
 * Hook for keyboard navigation in lists and grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'grid';
    loop?: boolean;
    autoFocus?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true, autoFocus = false } = options;
  const [currentIndex, setCurrentIndex] = useState(autoFocus ? 0 : -1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (items.length === 0) return;

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault();
          newIndex = currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault();
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault();
          newIndex = currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault();
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && items[currentIndex]) {
          e.preventDefault();
          items[currentIndex].click();
        }
        break;
    }

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < items.length) {
      setCurrentIndex(newIndex);
      items[newIndex].focus();
    }
  }, [items, currentIndex, orientation, loop]);

  // Update current index when items change
  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(items.length > 0 ? 0 : -1);
    }
  }, [items.length, currentIndex]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown
  };
}

/**
 * Hook for accessible form validation
 */
export function useAccessibleValidation() {
  const { announce } = useAccessibility();

  const announceErrors = useCallback((errors: Record<string, string>) => {
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      const message = errorCount === 1 
        ? 'There is 1 error in the form. Please review and correct it.'
        : `There are ${errorCount} errors in the form. Please review and correct them.`;
      
      announce(message, 'assertive');
    }
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  return {
    announceErrors,
    announceSuccess
  };
}

/**
 * Hook for accessible loading states
 */
export function useAccessibleLoading(isLoading: boolean, loadingMessage: string = 'Loading...') {
  const { announce } = useAccessibility();

  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage, 'polite');
    }
  }, [isLoading, loadingMessage, announce]);

  return {
    'aria-busy': isLoading,
    'aria-live': 'polite' as const
  };
}

/**
 * Advanced Accessibility Utilities for SWF Platform
 * Includes keyboard navigation, screen reader support, focus management, and ARIA enhancements
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Focus management state
interface FocusStackItem {
  element: HTMLElement;
  timestamp: number;
  context: string;
}

class FocusManager {
  private focusStack: FocusStackItem[] = [];
  private trapStack: HTMLElement[] = [];
  private lastFocusedElement: HTMLElement | null = null;

  /**
   * Save current focus for later restoration
   */
  saveFocus(context: string = 'general') {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push({
        element: activeElement,
        timestamp: Date.now(),
        context
      });
      this.lastFocusedElement = activeElement;
    }
  }

  /**
   * Restore previously saved focus
   */
  restoreFocus(context?: string): boolean {
    if (this.focusStack.length === 0) return false;

    // Find focus item by context or get the most recent
    let focusItem: FocusStackItem | undefined;
    
    if (context) {
      const index = this.focusStack.findLastIndex(item => item.context === context);
      if (index >= 0) {
        focusItem = this.focusStack.splice(index, 1)[0];
      }
    } else {
      focusItem = this.focusStack.pop();
    }

    if (focusItem && this.isElementFocusable(focusItem.element)) {
      try {
        focusItem.element.focus();
        return true;
      } catch (error) {
        console.warn('Failed to restore focus:', error);
      }
    }

    return false;
  }

  /**
   * Trap focus within a container (for modals, dialogs)
   */
  trapFocus(container: HTMLElement) {
    this.saveFocus('focus-trap');
    this.trapStack.push(container);

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    // Focus first element
    focusableElements[0].focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentFocusIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      let nextFocusIndex: number;

      if (event.shiftKey) {
        // Shift + Tab (backward)
        nextFocusIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
      } else {
        // Tab (forward)
        nextFocusIndex = currentFocusIndex >= focusableElements.length - 1 ? 0 : currentFocusIndex + 1;
      }

      event.preventDefault();
      focusableElements[nextFocusIndex].focus();
    };

    container.addEventListener('keydown', handleKeyDown);
    container.setAttribute('data-focus-trap', 'true');

    // Store cleanup function
    (container as any).__focusTrapCleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeAttribute('data-focus-trap');
    };
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(container?: HTMLElement) {
    const targetContainer = container || this.trapStack.pop();
    if (!targetContainer) return;

    // Call cleanup function
    if ((targetContainer as any).__focusTrapCleanup) {
      (targetContainer as any).__focusTrapCleanup();
      delete (targetContainer as any).__focusTrapCleanup;
    }

    // Remove from stack if not explicitly provided
    if (!container) {
      const index = this.trapStack.indexOf(targetContainer);
      if (index >= 0) {
        this.trapStack.splice(index, 1);
      }
    }

    // Restore focus
    this.restoreFocus('focus-trap');
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    return elements.filter(el => this.isElementVisible(el) && this.isElementFocusable(el));
  }

  /**
   * Check if element is currently focusable
   */
  private isElementFocusable(element: HTMLElement): boolean {
    return !element.disabled && 
           element.offsetParent !== null && 
           !element.hasAttribute('aria-hidden');
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * Move focus to next/previous focusable element
   */
  moveFocus(direction: 'next' | 'previous', container?: HTMLElement) {
    const scope = container || document.body;
    const focusableElements = this.getFocusableElements(scope);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    let targetIndex: number;
    if (direction === 'next') {
      targetIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
    } else {
      targetIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    if (focusableElements[targetIndex]) {
      focusableElements[targetIndex].focus();
    }
  }
}

export const focusManager = new FocusManager();

/**
 * ARIA Live Region Manager
 */
class AriaLiveManager {
  private liveRegion: HTMLElement | null = null;
  private politeRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegions();
  }

  private createLiveRegions() {
    // Assertive live region for important announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'assertive');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // Screen reader only
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);

    // Polite live region for status updates
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';
    this.politeRegion.style.cssText = this.liveRegion.style.cssText;
    document.body.appendChild(this.politeRegion);
  }

  /**
   * Announce message to screen readers (assertive)
   */
  announce(message: string) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
      
      // Clear after announcement to allow repeated announcements
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Announce status update to screen readers (polite)
   */
  announceStatus(message: string) {
    if (this.politeRegion) {
      this.politeRegion.textContent = message;
      
      setTimeout(() => {
        if (this.politeRegion) {
          this.politeRegion.textContent = '';
        }
      }, 1000);
    }
  }
}

export const ariaLiveManager = new AriaLiveManager();

/**
 * Keyboard Navigation Manager
 */
export class KeyboardNavigationManager {
  private static handlers: Map<string, Map<string, (event: KeyboardEvent) => void>> = new Map();
  private static globalHandlers: Map<string, (event: KeyboardEvent) => void> = new Map();

  /**
   * Register keyboard shortcuts for a specific context
   */
  static registerShortcuts(
    context: string,
    shortcuts: Record<string, (event: KeyboardEvent) => void>
  ) {
    if (!this.handlers.has(context)) {
      this.handlers.set(context, new Map());
    }

    const contextHandlers = this.handlers.get(context)!;
    
    Object.entries(shortcuts).forEach(([key, handler]) => {
      contextHandlers.set(this.normalizeKey(key), handler);
    });
  }

  /**
   * Register global keyboard shortcuts
   */
  static registerGlobalShortcuts(shortcuts: Record<string, (event: KeyboardEvent) => void>) {
    Object.entries(shortcuts).forEach(([key, handler]) => {
      this.globalHandlers.set(this.normalizeKey(key), handler);
    });
  }

  /**
   * Handle keyboard events for a specific context
   */
  static handleKeyboardEvent(event: KeyboardEvent, context?: string) {
    const key = this.getKeyFromEvent(event);
    
    // Check context-specific handlers first
    if (context) {
      const contextHandlers = this.handlers.get(context);
      if (contextHandlers?.has(key)) {
        const handler = contextHandlers.get(key)!;
        handler(event);
        return;
      }
    }

    // Check global handlers
    if (this.globalHandlers.has(key)) {
      const handler = this.globalHandlers.get(key)!;
      handler(event);
    }
  }

  /**
   * Unregister shortcuts for a context
   */
  static unregisterContext(context: string) {
    this.handlers.delete(context);
  }

  private static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '');
  }

  private static getKeyFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }
}

/**
 * High Contrast Mode Manager
 */
export class HighContrastManager {
  private static isHighContrastMode = false;

  static init() {
    // Check for user preference
    const saved = localStorage.getItem('swf_high_contrast');
    if (saved === 'true') {
      this.enable();
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addListener((e) => {
      if (e.matches && !this.isHighContrastMode) {
        this.enable();
      }
    });

    // Initial check
    if (mediaQuery.matches && !this.isHighContrastMode) {
      this.enable();
    }
  }

  static enable() {
    this.isHighContrastMode = true;
    document.documentElement.classList.add('high-contrast');
    localStorage.setItem('swf_high_contrast', 'true');
    
    // Update CSS custom properties for high contrast
    document.documentElement.style.setProperty('--contrast-ratio', '7:1');
    
    ariaLiveManager.announceStatus('High contrast mode enabled');
  }

  static disable() {
    this.isHighContrastMode = false;
    document.documentElement.classList.remove('high-contrast');
    localStorage.setItem('swf_high_contrast', 'false');
    
    document.documentElement.style.removeProperty('--contrast-ratio');
    
    ariaLiveManager.announceStatus('High contrast mode disabled');
  }

  static toggle() {
    if (this.isHighContrastMode) {
      this.disable();
    } else {
      this.enable();
    }
  }

  static isEnabled(): boolean {
    return this.isHighContrastMode;
  }
}

/**
 * Screen Reader Utilities
 */
export const screenReaderUtils = {
  /**
   * Hide element from screen readers
   */
  hide(element: HTMLElement) {
    element.setAttribute('aria-hidden', 'true');
  },

  /**
   * Show element to screen readers
   */
  show(element: HTMLElement) {
    element.removeAttribute('aria-hidden');
  },

  /**
   * Set element as screen reader only (visually hidden)
   */
  setScreenReaderOnly(element: HTMLElement) {
    element.className += ' sr-only';
    element.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
  },

  /**
   * Update aria-label dynamically
   */
  updateLabel(element: HTMLElement, label: string) {
    element.setAttribute('aria-label', label);
  },

  /**
   * Set aria-describedby relationship
   */
  setDescription(element: HTMLElement, descriptionId: string) {
    element.setAttribute('aria-describedby', descriptionId);
  },

  /**
   * Announce dynamic content changes
   */
  announceChange(message: string, priority: 'assertive' | 'polite' = 'polite') {
    if (priority === 'assertive') {
      ariaLiveManager.announce(message);
    } else {
      ariaLiveManager.announceStatus(message);
    }
  }
};

/**
 * React Hooks for Accessibility
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      focusManager.trapFocus(containerRef.current);
      return () => {
        if (containerRef.current) {
          focusManager.releaseFocusTrap(containerRef.current);
        }
      };
    }
  }, [isActive]);

  return containerRef;
}

export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
  context?: string,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    if (context) {
      KeyboardNavigationManager.registerShortcuts(context, shortcuts);
      return () => KeyboardNavigationManager.unregisterContext(context);
    } else {
      KeyboardNavigationManager.registerGlobalShortcuts(shortcuts);
    }
  }, [shortcuts, context, isActive]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isActive) {
      KeyboardNavigationManager.handleKeyboardEvent(event, context);
    }
  }, [context, isActive]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useAriaLive() {
  const announce = useCallback((message: string) => {
    ariaLiveManager.announce(message);
  }, []);

  const announceStatus = useCallback((message: string) => {
    ariaLiveManager.announceStatus(message);
  }, []);

  return { announce, announceStatus };
}

export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(HighContrastManager.isEnabled());

  const toggle = useCallback(() => {
    HighContrastManager.toggle();
    setIsHighContrast(HighContrastManager.isEnabled());
  }, []);

  return { isHighContrast, toggle };
}

/**
 * Accessibility Testing Utilities
 */
export const a11yTestUtils = {
  /**
   * Check for common accessibility issues
   */
  checkAccessibility(): { issues: string[]; score: number } {
    const issues: string[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }

    // Check for form inputs without labels
    const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const unlabeledWithoutLabel = Array.from(unlabeledInputs).filter(input => {
      const id = input.getAttribute('id');
      return !id || !document.querySelector(`label[for="${id}"]`);
    });
    
    if (unlabeledWithoutLabel.length > 0) {
      issues.push(`${unlabeledWithoutLabel.length} form inputs without proper labels`);
    }

    // Check for missing heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('No heading structure found');
    }

    // Check for missing landmarks
    const landmarks = document.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]');
    if (landmarks.length === 0) {
      issues.push('No landmark elements found');
    }

    // Calculate score (0-100)
    const maxIssues = 10;
    const score = Math.max(0, Math.round((1 - (issues.length / maxIssues)) * 100));

    return { issues, score };
  },

  /**
   * Test keyboard navigation
   */
  testKeyboardNavigation(): boolean {
    const focusableElements = focusManager.getFocusableElements(document.body);
    return focusableElements.length > 0;
  },

  /**
   * Check color contrast ratios
   */
  checkColorContrast(): { lowContrastElements: Element[] } {
    const lowContrastElements: Element[] = [];
    
    // This is a simplified check - in production, you'd use a proper contrast ratio calculation
    const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6');
    
    textElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const textColor = style.color;
      const backgroundColor = style.backgroundColor;
      
      // Simple heuristic check (not accurate, but gives an idea)
      if (textColor === backgroundColor || 
          (textColor.includes('rgb(') && backgroundColor.includes('rgb(') &&
           this.isLowContrast(textColor, backgroundColor))) {
        lowContrastElements.push(element);
      }
    });

    return { lowContrastElements };
  },

  private isLowContrast(color1: string, color2: string): boolean {
    // Simplified contrast check - implement proper WCAG algorithm for production
    return false; // Placeholder
  }
};

// Initialize accessibility features
if (typeof window !== 'undefined') {
  HighContrastManager.init();
  
  // Set up global keyboard shortcuts
  KeyboardNavigationManager.registerGlobalShortcuts({
    'alt+h': () => HighContrastManager.toggle(),
    'alt+?': () => {
      const results = a11yTestUtils.checkAccessibility();
      console.log('Accessibility Check:', results);
      ariaLiveManager.announce(`Accessibility score: ${results.score}%. ${results.issues.length} issues found.`);
    }
  });
}

export default {
  focusManager,
  ariaLiveManager,
  KeyboardNavigationManager,
  HighContrastManager,
  screenReaderUtils,
  a11yTestUtils,
  useFocusTrap,
  useKeyboardShortcuts,
  useAriaLive,
  useHighContrast
};

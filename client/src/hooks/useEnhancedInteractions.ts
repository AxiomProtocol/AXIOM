import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessibility } from './useAccessibility';

/**
 * Hook for keyboard shortcuts throughout the application
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { announce } = useAccessibility();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          e.target instanceof HTMLSelectElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Global shortcuts
      if (ctrlKey && e.key === 'k') {
        e.preventDefault();
        // Open global search
        const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement;
        searchButton?.click();
        announce('Global search opened', 'polite');
      }

      if (ctrlKey && e.key === 'd') {
        e.preventDefault();
        // Navigate to dashboard
        navigate('/dashboard');
        announce('Navigating to dashboard', 'polite');
      }

      if (ctrlKey && e.key === 'h') {
        e.preventDefault();
        // Navigate to home
        navigate('/');
        announce('Navigating to home', 'polite');
      }

      if (e.key === '?' && !ctrlKey && !e.shiftKey) {
        e.preventDefault();
        // Show keyboard shortcuts help
        showKeyboardShortcutsHelp();
        announce('Keyboard shortcuts help opened', 'polite');
      }

      if (e.key === 'Escape') {
        // Close modals, dropdowns, etc.
        const closeButtons = document.querySelectorAll('[data-close-modal], [data-close-dropdown]');
        closeButtons.forEach(button => (button as HTMLElement).click());
      }

      // Number keys for quick navigation
      if (e.key >= '1' && e.key <= '9' && !ctrlKey) {
        const quickNavItems = document.querySelectorAll('[data-quick-nav]');
        const index = parseInt(e.key) - 1;
        if (quickNavItems[index]) {
          e.preventDefault();
          (quickNavItems[index] as HTMLElement).click();
          announce(`Quick navigation to ${quickNavItems[index].textContent}`, 'polite');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [announce]);

  const showKeyboardShortcutsHelp = useCallback(() => {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) {
      modal.style.display = 'block';
    } else {
      // Create shortcuts modal if it doesn't exist
      createKeyboardShortcutsModal();
    }
  }, []);

  return { showKeyboardShortcutsHelp };
}

/**
 * Hook for haptic feedback on mobile devices
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' = 'light') => {
    if ('vibrate' in navigator) {
      // Fallback to vibration API
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        selection: [5],
        impact: [15]
      };
      navigator.vibrate(patterns[type]);
    }

    // iOS Haptic Feedback (if available)
    if ('hapticFeedback' in navigator) {
      try {
        (navigator as any).hapticFeedback.impactOccurred(type);
      } catch (error) {
        // Silent fail
      }
    }
  }, []);

  return { triggerHaptic };
}

/**
 * Hook for enhanced form validation with real-time feedback
 */
export function useEnhancedFormValidation(validationRules: Record<string, (value: any) => string | null>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValid, setIsValid] = useState(true);
  const { announce } = useAccessibility();
  const { triggerHaptic } = useHapticFeedback();

  const validateField = useCallback((fieldName: string, value: any) => {
    const rule = validationRules[fieldName];
    if (!rule) return null;

    const error = rule(value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));

    return error;
  }, [validationRules]);

  const validateAllFields = useCallback((values: Record<string, any>) => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setIsValid(!hasErrors);
    
    if (hasErrors) {
      triggerHaptic('medium');
      const errorCount = Object.keys(newErrors).length;
      announce(`Form has ${errorCount} error${errorCount > 1 ? 's' : ''}`, 'assertive');
    }

    return !hasErrors;
  }, [validationRules, validateField, triggerHaptic, announce]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    validateField(fieldName, value);
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, [validateField]);

  const handleFieldBlur = useCallback((fieldName: string, value: any) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    const error = validateField(fieldName, value);
    if (error) {
      triggerHaptic('light');
    }
  }, [validateField, triggerHaptic]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
    setIsValid(true);
  }, []);

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName];
    
    return {
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': hasError ? `${fieldName}-error` : undefined,
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => handleFieldBlur(fieldName, e.target.value),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(fieldName, e.target.value)
    };
  }, [errors, touched, handleFieldBlur, handleFieldChange]);

  return {
    errors,
    touched,
    isValid,
    validateField,
    validateAllFields,
    handleFieldChange,
    handleFieldBlur,
    clearErrors,
    getFieldProps
  };
}

/**
 * Hook for drag and drop functionality
 */
export function useDragAndDrop<T>(
  onDrop: (items: T[], targetIndex?: number) => void,
  onDragStart?: (item: T) => void,
  onDragEnd?: () => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const { triggerHaptic } = useHapticFeedback();

  const handleDragStart = useCallback((item: T) => {
    setIsDragging(true);
    setDraggedItem(item);
    triggerHaptic('selection');
    onDragStart?.(item);
  }, [onDragStart, triggerHaptic]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    onDragEnd?.();
  }, [onDragEnd]);

  const handleDrop = useCallback((items: T[], targetIndex?: number) => {
    triggerHaptic('impact');
    onDrop(items, targetIndex);
    handleDragEnd();
  }, [onDrop, triggerHaptic, handleDragEnd]);

  const getDragHandleProps = useCallback((item: T) => ({
    draggable: true,
    onDragStart: () => handleDragStart(item),
    onDragEnd: handleDragEnd,
    style: {
      cursor: isDragging ? 'grabbing' : 'grab'
    }
  }), [isDragging, handleDragStart, handleDragEnd]);

  const getDropZoneProps = useCallback((targetIndex?: number) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
    },
    onDragLeave: (e: React.DragEvent) => {
      e.currentTarget.classList.remove('drag-over');
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      if (draggedItem) {
        handleDrop([draggedItem], targetIndex);
      }
    }
  }), [draggedItem, handleDrop]);

  return {
    isDragging,
    draggedItem,
    getDragHandleProps,
    getDropZoneProps
  };
}

/**
 * Hook for smooth scrolling and scroll management
 */
export function useSmoothScroll() {
  const scrollToElement = useCallback((elementId: string, offset: number = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  return {
    scrollToElement,
    scrollToTop,
    scrollToBottom
  };
}

/**
 * Hook for copy to clipboard with feedback
 */
export function useCopyToClipboard() {
  const { announce } = useAccessibility();
  const { triggerHaptic } = useHapticFeedback();

  const copyToClipboard = useCallback(async (text: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('light');
      announce(successMessage || 'Copied to clipboard', 'polite');
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        triggerHaptic('light');
        announce(successMessage || 'Copied to clipboard', 'polite');
        return true;
      } catch (fallbackError) {
        document.body.removeChild(textArea);
        announce('Failed to copy to clipboard', 'assertive');
        return false;
      }
    }
  }, [announce, triggerHaptic]);

  return { copyToClipboard };
}

/**
 * Hook for user activity tracking
 */
export function useActivityTracking() {
  const lastActivityRef = useRef(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout>();

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);

    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set idle timeout (5 minutes)
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Initialize timer
    resetIdleTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [resetIdleTimer]);

  return { isIdle, lastActivity: lastActivityRef.current };
}

/**
 * Create keyboard shortcuts help modal
 */
function createKeyboardShortcutsModal() {
  const modal = document.createElement('div');
  modal.id = 'keyboard-shortcuts-modal';
  modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4';
  modal.style.display = 'none';

  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-md w-full p-6 max-h-96 overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Keyboard Shortcuts</h2>
        <button data-close-modal class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span>Search</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + K</kbd>
        </div>
        <div class="flex justify-between">
          <span>Dashboard</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + D</kbd>
        </div>
        <div class="flex justify-between">
          <span>Home</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + H</kbd>
        </div>
        <div class="flex justify-between">
          <span>Help</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">?</kbd>
        </div>
        <div class="flex justify-between">
          <span>Close Modal</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
        </div>
        <div class="flex justify-between">
          <span>Quick Navigation</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">1-9</kbd>
        </div>
      </div>
    </div>
  `;

  // Close modal functionality
  const closeButton = modal.querySelector('[data-close-modal]');
  const closeModal = () => {
    modal.style.display = 'none';
  };

  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      closeModal();
    }
  });

  document.body.appendChild(modal);
}

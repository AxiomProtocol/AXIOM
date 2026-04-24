import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
  global?: boolean; // If true, works globally; if false, only when element is focused
}

/**
 * Advanced keyboard shortcuts hook with conflict resolution and help system
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: {
    enabled?: boolean;
    target?: React.RefObject<HTMLElement>;
    showHelp?: boolean;
  } = {}
) {
  const { enabled = true, target, showHelp = true } = options;
  const shortcutsRef = useRef(shortcuts);
  const helpVisibleRef = useRef(false);

  // Update shortcuts reference when they change
  shortcutsRef.current = shortcuts;

  // Normalize key combinations for consistent matching
  const normalizeKey = useCallback((key: string) => {
    return key.toLowerCase().replace(/\s+/g, '');
  }, []);

  // Create a key combination string for matching
  const createKeyCombo = useCallback((event: KeyboardEvent) => {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(normalizeKey(event.key));
    return parts.join('+');
  }, [normalizeKey]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const eventCombo = createKeyCombo(event);
    
    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const shortcutParts = [];
      if (shortcut.ctrlKey) shortcutParts.push('ctrl');
      if (shortcut.altKey) shortcutParts.push('alt');
      if (shortcut.shiftKey) shortcutParts.push('shift');
      if (shortcut.metaKey) shortcutParts.push('meta');
      shortcutParts.push(normalizeKey(shortcut.key));
      
      return shortcutParts.join('+') === eventCombo;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // Check if we should execute based on focus and global settings
      const shouldExecute = matchingShortcut.global || 
                            !target || 
                            target.current?.contains(event.target as Node);
      
      if (shouldExecute) {
        matchingShortcut.action();
      }
    }

    // Show help with '?' or 'F1'
    if (showHelp && (eventCombo === '?' || eventCombo === 'f1')) {
      event.preventDefault();
      showShortcutsHelp();
    }
  }, [enabled, createKeyCombo, target, showHelp]);

  // Show shortcuts help modal/overlay
  const showShortcutsHelp = useCallback(() => {
    if (helpVisibleRef.current) return;
    
    helpVisibleRef.current = true;
    
    // Create help modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.style.cssText = `
      margin: 0 0 1.5rem 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
    `;

    const shortcutsList = document.createElement('div');
    shortcutsList.style.cssText = `
      display: grid;
      gap: 0.75rem;
    `;

    // Add shortcuts to the list
    shortcutsRef.current.forEach(shortcut => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 8px;
      `;

      const description = document.createElement('span');
      description.textContent = shortcut.description;
      description.style.cssText = `
        color: #374151;
        font-weight: 500;
      `;

      const keys = document.createElement('span');
      const keyParts = [];
      if (shortcut.ctrlKey) keyParts.push('Ctrl');
      if (shortcut.altKey) keyParts.push('Alt');
      if (shortcut.shiftKey) keyParts.push('Shift');
      if (shortcut.metaKey) keyParts.push('⌘');
      keyParts.push(shortcut.key.toUpperCase());
      
      keys.textContent = keyParts.join(' + ');
      keys.style.cssText = `
        background: #e5e7eb;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.875rem;
        color: #374151;
      `;

      item.appendChild(description);
      item.appendChild(keys);
      shortcutsList.appendChild(item);
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close (Esc)';
    closeButton.style.cssText = `
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
    `;

    const closeModal = () => {
      modal.remove();
      helpVisibleRef.current = false;
    };

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Close with Esc key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    content.appendChild(title);
    content.appendChild(shortcutsList);
    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Focus the close button for accessibility
    closeButton.focus();
  }, []);

  // Register event listeners
  useEffect(() => {
    const element = target?.current || document;
    
    if (enabled) {
      element.addEventListener('keydown', handleKeyDown);
      
      return () => {
        element.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown, target]);

  return {
    showHelp: showShortcutsHelp
  };
}

/**
 * Predefined shortcuts for common SWF platform actions
 */
export const platformShortcuts: KeyboardShortcut[] = [
  {
    key: 'h',
    ctrlKey: true,
    action: () => {
      console.log('🔧 NAVIGATION DEBUG: Keyboard shortcut Ctrl+H triggered - redirecting to home');
      console.trace('Navigation stack trace:');
      // FIXED: Use React Router instead of window.location.href to avoid bypassing router
      const event = new CustomEvent('platform:navigate', { detail: { path: '/' } });
      document.dispatchEvent(event);
    },
    description: 'Go to Home',
    global: true
  },
  {
    key: 'd',
    ctrlKey: true,
    action: () => {
      console.log('🔧 NAVIGATION DEBUG: Keyboard shortcut Ctrl+D triggered - redirecting to dashboard');
      console.trace('Navigation stack trace:');
      // FIXED: Use React Router instead of window.location.href to avoid bypassing router
      const event = new CustomEvent('platform:navigate', { detail: { path: '/dashboard' } });
      document.dispatchEvent(event);
    },
    description: 'Go to Dashboard',
    global: true
  },
  {
    key: 's',
    ctrlKey: true,
    action: () => {
      // Trigger save action - this should be customized per page
      const event = new CustomEvent('platform:save');
      document.dispatchEvent(event);
    },
    description: 'Save current form/data',
    global: true
  },
  {
    key: 'k',
    ctrlKey: true,
    action: () => {
      // Trigger search - this should open search modal
      const event = new CustomEvent('platform:search');
      document.dispatchEvent(event);
    },
    description: 'Open search',
    global: true,
    preventDefault: true
  },
  {
    key: 'Escape',
    action: () => {
      // Close modals, reset forms, etc.
      const event = new CustomEvent('platform:escape');
      document.dispatchEvent(event);
    },
    description: 'Close modals/cancel actions',
    global: true
  },
  {
    key: '?',
    action: () => {}, // Handled by the hook itself
    description: 'Show keyboard shortcuts',
    global: true,
    preventDefault: true
  }
];

/**
 * Hook for navigation shortcuts
 */
export function useNavigationShortcuts() {
  return useKeyboardShortcuts(platformShortcuts, {
    enabled: true,
    showHelp: true
  });
}

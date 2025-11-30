import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Auto-complete functionality for wallet addresses and common inputs
 */
export function useAutoComplete<T extends string>(
  items: T[],
  options: {
    minLength?: number;
    maxSuggestions?: number;
    fuzzyMatch?: boolean;
  } = {}
) {
  const { minLength = 2, maxSuggestions = 10, fuzzyMatch = false } = options;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fuzzy matching algorithm
  const fuzzyScore = useCallback((item: string, query: string): number => {
    const itemLower = item.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (itemLower.includes(queryLower)) return 100;
    
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < itemLower.length && queryIndex < queryLower.length; i++) {
      if (itemLower[i] === queryLower[queryIndex]) {
        score += 1;
        queryIndex++;
      }
    }
    
    return queryIndex === queryLower.length ? score / queryLower.length : 0;
  }, []);

  // Filter and sort suggestions
  useEffect(() => {
    if (query.length < minLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let filtered: T[];
    
    if (fuzzyMatch) {
      filtered = items
        .map(item => ({ item, score: fuzzyScore(item, query) }))
        .filter(({ score }) => score > 0.3)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    } else {
      filtered = items.filter(item => 
        item.toLowerCase().includes(query.toLowerCase())
      );
    }

    setSuggestions(filtered.slice(0, maxSuggestions));
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [query, items, minLength, maxSuggestions, fuzzyMatch, fuzzyScore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          setQuery(suggestions[selectedIndex]);
          setIsOpen(false);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex]);

  const selectSuggestion = useCallback((suggestion: T) => {
    setQuery(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isOpen,
    selectedIndex,
    handleKeyDown,
    selectSuggestion,
    closeSuggestions
  };
}

/**
 * Recently used items management
 */
export function useRecentItems<T extends { id: string; label: string }>(
  storageKey: string,
  maxItems: number = 10
) {
  const [recentItems, setRecentItems] = useLocalStorage<T[]>(`swf-recent-${storageKey}`, []);

  const addRecentItem = useCallback((item: T) => {
    setRecentItems(prev => {
      const filtered = prev.filter(existing => existing.id !== item.id);
      return [item, ...filtered].slice(0, maxItems);
    });
  }, [setRecentItems, maxItems]);

  const removeRecentItem = useCallback((id: string) => {
    setRecentItems(prev => prev.filter(item => item.id !== id));
  }, [setRecentItems]);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
  }, [setRecentItems]);

  return {
    recentItems,
    addRecentItem,
    removeRecentItem,
    clearRecentItems
  };
}

/**
 * Intelligent suggestions based on user behavior
 */
export function useIntelligentSuggestions() {
  const [interactionPatterns] = useLocalStorage<Array<{
    action: string;
    context: Record<string, any>;
    timestamp: number;
    frequency: number;
  }>>('swf-interaction-patterns', []);

  const trackAction = useCallback((action: string, context: Record<string, any> = {}) => {
    // This would typically update the interaction patterns
    console.log('🧠 Tracking action:', action, context);
  }, []);

  const getSuggestions = useCallback((currentContext: Record<string, any> = {}): string[] => {
    if (!interactionPatterns || interactionPatterns.length === 0) return [];

    // Score patterns based on frequency, recency, and context similarity
    const scoredPatterns = interactionPatterns.map(pattern => {
      const recencyScore = Math.max(0, 1 - (Date.now() - pattern.timestamp) / (7 * 24 * 60 * 60 * 1000));
      const frequencyScore = Math.min(1, pattern.frequency / 10);
      
      // Simple context similarity
      const contextSimilarity = Object.keys(currentContext).length > 0 
        ? Object.keys(currentContext).filter(key => 
            pattern.context[key] === currentContext[key]
          ).length / Math.max(Object.keys(currentContext).length, Object.keys(pattern.context).length)
        : 0.5;
      
      const totalScore = (recencyScore * 0.3) + (frequencyScore * 0.4) + (contextSimilarity * 0.3);
      
      return { ...pattern, score: totalScore };
    });

    return scoredPatterns
      .filter(p => p.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => p.action);
  }, [interactionPatterns]);

  return {
    trackAction,
    getSuggestions
  };
}

/**
 * Smart form helper that learns from user inputs
 */
export function useSmartForm(formId: string) {
  const [formPatterns] = useLocalStorage<Record<string, {
    commonValues: string[];
    lastUsed: Record<string, number>;
    validationPatterns: Record<string, string>;
  }>>(`swf-form-patterns-${formId}`, {});

  const [currentInputs, setCurrentInputs] = useState<Record<string, string>>({});

  const recordInput = useCallback((fieldName: string, value: string) => {
    setCurrentInputs(prev => ({ ...prev, [fieldName]: value }));
    
    // Record common values for future suggestions
    if (value.length > 3) { // Only record meaningful inputs
      // This would update form patterns in real implementation
      console.log('📝 Recording form input:', fieldName, value);
    }
  }, []);

  const getFieldSuggestions = useCallback((fieldName: string): string[] => {
    const patterns = formPatterns[fieldName];
    if (!patterns) return [];

    return patterns.commonValues
      .sort((a, b) => (patterns.lastUsed[b] || 0) - (patterns.lastUsed[a] || 0))
      .slice(0, 5);
  }, [formPatterns]);

  const validateField = useCallback((fieldName: string, value: string): string | null => {
    const patterns = formPatterns[fieldName];
    if (!patterns || !patterns.validationPatterns[fieldName]) return null;

    const regex = new RegExp(patterns.validationPatterns[fieldName]);
    return regex.test(value) ? null : 'Invalid format';
  }, [formPatterns]);

  return {
    currentInputs,
    recordInput,
    getFieldSuggestions,
    validateField
  };
}

/**
 * Customizable dashboard widgets management
 */
export function useDashboardWidgets() {
  const [widgets, setWidgets] = useLocalStorage<Array<{
    id: string;
    type: string;
    title: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    config: Record<string, any>;
    isVisible: boolean;
  }>>('swf-dashboard-widgets', []);

  const addWidget = useCallback((widget: {
    type: string;
    title: string;
    config?: Record<string, any>;
  }) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      ...widget,
      position: { x: 0, y: 0 },
      size: { w: 4, h: 3 },
      config: widget.config || {},
      isVisible: true
    };

    setWidgets(prev => [...prev, newWidget]);
    return newWidget.id;
  }, [setWidgets]);

  const updateWidget = useCallback((id: string, updates: Partial<{
    position: { x: number; y: number };
    size: { w: number; h: number };
    config: Record<string, any>;
    title: string;
    isVisible: boolean;
  }>) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, ...updates } : widget
    ));
  }, [setWidgets]);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  }, [setWidgets]);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setWidgets(prev => {
      const widgetMap = new Map(prev.map(w => [w.id, w]));
      return newOrder.map(id => widgetMap.get(id)).filter(Boolean) as typeof prev;
    });
  }, [setWidgets]);

  return {
    widgets,
    addWidget,
    updateWidget,
    removeWidget,
    reorderWidgets
  };
}

/**
 * Search history and intelligent search suggestions
 */
export function useSearchHistory(maxHistory: number = 20) {
  const [searchHistory, setSearchHistory] = useLocalStorage<Array<{
    query: string;
    timestamp: number;
    results: number;
    category?: string;
  }>>('swf-search-history', []);

  const addSearch = useCallback((query: string, results: number, category?: string) => {
    if (query.trim().length < 2) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(search => search.query !== query);
      const newSearch = {
        query: query.trim(),
        timestamp: Date.now(),
        results,
        category
      };
      
      return [newSearch, ...filtered].slice(0, maxHistory);
    });
  }, [setSearchHistory, maxHistory]);

  const getSearchSuggestions = useCallback((partialQuery: string): string[] => {
    if (partialQuery.length < 1) return [];

    return searchHistory
      .filter(search => 
        search.query.toLowerCase().includes(partialQuery.toLowerCase()) &&
        search.results > 0
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(search => search.query);
  }, [searchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, [setSearchHistory]);

  return {
    searchHistory,
    addSearch,
    getSearchSuggestions,
    clearSearchHistory
  };
}

/**
 * Theme and appearance preferences with system detection
 */
export function useThemePreferences() {
  const [preferences, setPreferences] = useLocalStorage('swf-theme-preferences', {
    mode: 'auto' as 'light' | 'dark' | 'auto',
    accentColor: 'blue',
    compactMode: false,
    highContrast: false
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const actualTheme = preferences.mode === 'auto' ? systemTheme : preferences.mode;

  const updatePreferences = useCallback((updates: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, [setPreferences]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', actualTheme === 'dark');
    document.documentElement.classList.toggle('compact', preferences.compactMode);
    document.documentElement.classList.toggle('high-contrast', preferences.highContrast);
    document.documentElement.style.setProperty('--accent-color', preferences.accentColor);
  }, [actualTheme, preferences]);

  return {
    preferences,
    actualTheme,
    systemTheme,
    updatePreferences
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export interface AutoSaveOptions<T> {
  data: T;
  saveFunction: (data: T) => Promise<void>;
  delay?: number; // milliseconds
  enabled?: boolean;
  onSave?: (data: T) => void;
  onError?: (error: Error) => void;
  skipEmptyData?: boolean;
}

/**
 * Auto-save hook with intelligent timing and network awareness
 */
export function useAutoSave<T extends Record<string, any>>({
  data,
  saveFunction,
  delay = 2000,
  enabled = true,
  onSave,
  onError,
  skipEmptyData = true
}: AutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<T>(data);
  const pendingSaveRef = useRef(false);

  // Check if data is considered empty
  const isDataEmpty = useCallback((data: T) => {
    if (!skipEmptyData) return false;
    
    return Object.values(data).every(value => {
      if (typeof value === 'string') return value.trim() === '';
      if (typeof value === 'number') return value === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length === 0;
      }
      return !value;
    });
  }, [skipEmptyData]);

  // Compare data to detect changes
  const hasDataChanged = useCallback((newData: T, oldData: T) => {
    return JSON.stringify(newData) !== JSON.stringify(oldData);
  }, []);

  // Perform the actual save operation
  const performSave = useCallback(async (dataToSave: T) => {
    if (!enabled || !isOnline || isDataEmpty(dataToSave)) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      pendingSaveRef.current = true;

      await saveFunction(dataToSave);
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = dataToSave;
      onSave?.(dataToSave);

      console.log('💾 Auto-save successful:', new Date().toLocaleTimeString());
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error('Save failed');
      setSaveError(saveError);
      onError?.(saveError);
      console.error('💾 Auto-save failed:', saveError);
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  }, [enabled, isOnline, saveFunction, onSave, onError, isDataEmpty]);

  // Debounced save trigger
  useEffect(() => {
    if (!enabled || !isOnline) {
      return;
    }

    // Check if data has actually changed
    if (!hasDataChanged(data, lastSavedDataRef.current)) {
      return;
    }

    // Skip if data is empty
    if (isDataEmpty(data)) {
      return;
    }

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      performSave(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, isOnline, delay, performSave, hasDataChanged, isDataEmpty]);

  // Save immediately when going offline (if there are unsaved changes)
  useEffect(() => {
    if (!isOnline && hasUnsavedChanges && !pendingSaveRef.current) {
      console.log('💾 Network going offline - saving immediately');
      performSave(data);
    }
  }, [isOnline, hasUnsavedChanges, data, performSave]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return performSave(data);
  }, [data, performSave]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveError,
    saveNow,
    isOnline
  };
}

/**
 * Hook for auto-saving form data specifically
 */
export function useFormAutoSave<T extends Record<string, any>>(
  formData: T,
  submitUrl: string,
  options: {
    enabled?: boolean;
    delay?: number;
    onSave?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const saveFunction = useCallback(async (data: T) => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ ...data, autoSave: true })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [submitUrl]);

  return useAutoSave({
    data: formData,
    saveFunction,
    ...options
  });
}

/**
 * Hook for draft management with multiple versions
 */
export function useDraftManager<T>(
  key: string,
  initialData: T,
  options: {
    maxVersions?: number;
    autoSaveInterval?: number;
    compressionThreshold?: number; // bytes
  } = {}
) {
  const { maxVersions = 5, autoSaveInterval = 30000, compressionThreshold = 10000 } = options;
  
  const [drafts, setDrafts] = useState<Array<{
    id: string;
    data: T;
    timestamp: number;
    size: number;
  }>>([]);
  
  const [currentDraft, setCurrentDraft] = useState<T>(initialData);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`drafts-${key}`);
      if (stored) {
        const parsedDrafts = JSON.parse(stored);
        setDrafts(parsedDrafts);
        
        // Load most recent draft
        if (parsedDrafts.length > 0) {
          setCurrentDraft(parsedDrafts[0].data);
        }
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, [key]);

  // Save draft to localStorage
  const saveDraft = useCallback((data: T, manual: boolean = false) => {
    const draft = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      size: JSON.stringify(data).length
    };

    setDrafts(prev => {
      const newDrafts = [draft, ...prev];
      
      // Limit number of drafts
      const limitedDrafts = newDrafts.slice(0, maxVersions);
      
      // Save to localStorage
      try {
        localStorage.setItem(`drafts-${key}`, JSON.stringify(limitedDrafts));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
      
      return limitedDrafts;
    });

    setCurrentDraft(data);
    
    if (manual) {
      console.log('📝 Draft saved manually');
    }
  }, [key, maxVersions]);

  // Auto-save current draft
  useAutoSave({
    data: currentDraft,
    saveFunction: async (data) => {
      saveDraft(data, false);
    },
    delay: autoSaveInterval,
    enabled: true,
    skipEmptyData: true
  });

  // Load specific draft
  const loadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft.data);
      return true;
    }
    return false;
  }, [drafts]);

  // Delete draft
  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => {
      const newDrafts = prev.filter(d => d.id !== draftId);
      
      try {
        localStorage.setItem(`drafts-${key}`, JSON.stringify(newDrafts));
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
      
      return newDrafts;
    });
  }, [key]);

  // Clear all drafts
  const clearDrafts = useCallback(() => {
    setDrafts([]);
    localStorage.removeItem(`drafts-${key}`);
    setCurrentDraft(initialData);
  }, [key, initialData]);

  return {
    currentDraft,
    setCurrentDraft,
    drafts,
    saveDraft: (data: T) => saveDraft(data, true),
    loadDraft,
    deleteDraft,
    clearDrafts,
    hasDrafts: drafts.length > 0
  };
}

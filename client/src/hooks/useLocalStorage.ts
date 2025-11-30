import { useState, useEffect, useCallback } from 'react';

/**
 * Advanced localStorage hook with type safety, validation, and error handling
 * Provides automatic JSON serialization/deserialization and change listeners
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: {
    validate?: (value: any) => boolean;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    onError?: (error: Error) => void;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    validate = () => true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError = console.error
  } = options;

  // Initialize state from localStorage or default value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return defaultValue;
      }

      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      const parsed = deserialize(item);
      return validate(parsed) ? parsed : defaultValue;
    } catch (error) {
      onError(new Error(`Failed to read localStorage key "${key}": ${error}`));
      return defaultValue;
    }
  });

  // Update localStorage whenever state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      if (!validate(valueToStore)) {
        throw new Error(`Invalid value for localStorage key "${key}"`);
      }

      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialize(valueToStore));
        
        // Dispatch custom event for cross-tab synchronization
        window.dispatchEvent(new CustomEvent('localStorage', {
          detail: { key, value: valueToStore }
        }));
      }
    } catch (error) {
      onError(new Error(`Failed to set localStorage key "${key}": ${error}`));
    }
  }, [key, storedValue, serialize, validate, onError]);

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('localStorage', {
          detail: { key, value: null }
        }));
      }
    } catch (error) {
      onError(new Error(`Failed to remove localStorage key "${key}": ${error}`));
    }
  }, [key, defaultValue, onError]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key === key) {
        try {
          const newValue = e.newValue ? deserialize(e.newValue) : defaultValue;
          if (validate(newValue)) {
            setStoredValue(newValue);
          }
        } catch (error) {
          onError(new Error(`Failed to sync localStorage key "${key}": ${error}`));
        }
      } else if ('detail' in e && e.detail.key === key) {
        setStoredValue(e.detail.value ?? defaultValue);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('localStorage', handleStorageChange as EventListener);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('localStorage', handleStorageChange as EventListener);
      };
    }
  }, [key, defaultValue, deserialize, validate, onError]);

  return [storedValue, setValue, removeValue];
}

/**
 * Specialized hook for user preferences with predefined structure
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr';
  currency: 'USD' | 'EUR' | 'GBP';
  dashboardLayout: 'grid' | 'list';
  notifications: {
    email: boolean;
    push: boolean;
    portfolio: boolean;
    security: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  privacy: {
    analytics: boolean;
    cookies: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  currency: 'USD',
  dashboardLayout: 'grid',
  notifications: {
    email: true,
    push: true,
    portfolio: true,
    security: true
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium'
  },
  privacy: {
    analytics: true,
    cookies: true
  }
};

export function useUserPreferences() {
  return useLocalStorage('swf-user-preferences', defaultPreferences, {
    validate: (value) => {
      return value && 
             typeof value === 'object' &&
             typeof value.theme === 'string' &&
             typeof value.language === 'string' &&
             typeof value.notifications === 'object';
    }
  });
}

/**
 * Hook for persisting form data to prevent loss during navigation
 */
export function useFormPersistence<T extends Record<string, any>>(
  formId: string,
  initialValues: T,
  options: {
    clearOnSubmit?: boolean;
    maxAge?: number; // in milliseconds
  } = {}
) {
  const { clearOnSubmit = true, maxAge = 24 * 60 * 60 * 1000 } = options; // 24 hours default

  const storageKey = `swf-form-${formId}`;
  
  const [formData, setFormData, clearFormData] = useLocalStorage(
    storageKey,
    { values: initialValues, timestamp: Date.now() },
    {
      validate: (value) => {
        if (!value || typeof value !== 'object') return false;
        
        // Check if data is too old
        if (maxAge && value.timestamp && Date.now() - value.timestamp > maxAge) {
          return false;
        }
        
        return true;
      }
    }
  );

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({
      values: { ...prev.values, ...updates },
      timestamp: Date.now()
    }));
  }, [setFormData]);

  const resetForm = useCallback(() => {
    setFormData({
      values: initialValues,
      timestamp: Date.now()
    });
  }, [setFormData, initialValues]);

  const clearPersistedData = useCallback(() => {
    clearFormData();
  }, [clearFormData]);

  const submitForm = useCallback(() => {
    if (clearOnSubmit) {
      clearPersistedData();
    }
  }, [clearOnSubmit, clearPersistedData]);

  return {
    formData: formData.values,
    updateFormData,
    resetForm,
    clearPersistedData,
    submitForm,
    hasPersistedData: Object.keys(formData.values).length > 0
  };
}

/**
 * Hook for managing recently viewed items/pages
 */
export function useRecentlyViewed<T extends { id: string; title: string; url?: string }>(
  maxItems: number = 10
) {
  const [recentItems, setRecentItems] = useLocalStorage<T[]>('swf-recently-viewed', []);

  const addToRecent = useCallback((item: T) => {
    setRecentItems(prev => {
      const filtered = prev.filter(existing => existing.id !== item.id);
      return [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, maxItems);
    });
  }, [setRecentItems, maxItems]);

  const removeFromRecent = useCallback((id: string) => {
    setRecentItems(prev => prev.filter(item => item.id !== id));
  }, [setRecentItems]);

  const clearRecent = useCallback(() => {
    setRecentItems([]);
  }, [setRecentItems]);

  return {
    recentItems,
    addToRecent,
    removeFromRecent,
    clearRecent
  };
}

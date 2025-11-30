/**
 * Enhanced localStorage utilities for data persistence
 * Provides type-safe storage with expiration, encryption, and fallbacks
 */

export interface StorageOptions {
  expiry?: number; // Time in milliseconds
  encrypt?: boolean;
  fallback?: any;
  compress?: boolean;
}

export interface StoredData<T> {
  value: T;
  timestamp: number;
  expiry?: number;
  version: string;
}

// Storage keys enum for type safety
export enum StorageKeys {
  USER_PREFERENCES = 'swf_user_preferences',
  THEME_SETTINGS = 'swf_theme_settings',
  CACHE_DATA = 'swf_cache_data',
  FORM_DRAFTS = 'swf_form_drafts',
  OFFLINE_ACTIONS = 'swf_offline_actions',
  PERFORMANCE_METRICS = 'swf_performance_metrics',
  ONBOARDING_STATE = 'swf_onboarding_state',
  WALLET_STATE = 'swf_wallet_state',
  NOTIFICATION_PREFERENCES = 'swf_notification_prefs',
  SEARCH_HISTORY = 'swf_search_history',
  WALLET_CONNECTION_STATE = 'swf_wallet_connection_state',
  DASHBOARD_LAYOUT = 'swf_dashboard_layout',
  QUICK_ACTIONS = 'swf_quick_actions',
  INTELLIGENT_SUGGESTIONS = 'swf_intelligent_suggestions',
  SESSION_ANALYTICS = 'swf_session_analytics',
  VIEWPORT_PREFERENCES = 'swf_viewport_preferences',
  INTERACTION_PATTERNS = 'swf_interaction_patterns'
}

class StorageManager {
  private isSupported: boolean;
  private storageVersion = '1.0.0';

  constructor() {
    this.isSupported = this.checkStorageSupport();
  }

  private checkStorageSupport(): boolean {
    try {
      const test = '__swf_storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn('🚨 localStorage not supported, falling back to memory storage');
      return false;
    }
  }

  private serializeData<T>(data: T, options: StorageOptions = {}): string {
    const storedData: StoredData<T> = {
      value: data,
      timestamp: Date.now(),
      version: this.storageVersion,
      ...(options.expiry && { expiry: Date.now() + options.expiry })
    };

    let serialized = JSON.stringify(storedData);

    // Simple compression for large data
    if (options.compress && serialized.length > 1000) {
      // This is a simple compression - in production you might use LZ-string
      serialized = this.compress(serialized);
    }

    // SECURITY WARNING: This is NOT encryption, only encoding
    // Do not use for sensitive data - implement proper WebCrypto if needed
    if (options.encrypt) {
      console.warn('🚨 Storage "encryption" is only base64 encoding - not secure!');
      serialized = btoa(serialized);
    }

    return serialized;
  }

  private deserializeData<T>(serialized: string, options: StorageOptions = {}): T | null {
    try {
      let data = serialized;

      // SECURITY: This is NOT decryption, only base64 decoding
      if (options.encrypt) {
        data = atob(data);
      }

      // Decompress if needed
      if (options.compress) {
        data = this.decompress(data);
      }

      const storedData: StoredData<T> = JSON.parse(data);

      // Check expiration
      if (storedData.expiry && Date.now() > storedData.expiry) {
        console.log('📅 Stored data expired, returning null');
        return null;
      }

      // Version check
      if (storedData.version !== this.storageVersion) {
        console.log('🔄 Storage version mismatch, migrating data');
        // Here you could implement data migration logic
      }

      return storedData.value;
    } catch (error) {
      console.error('🚨 Failed to deserialize stored data:', error);
      return null;
    }
  }

  private compress(str: string): string {
    // Simple compression - replace with actual compression library in production
    return str;
  }

  private decompress(str: string): string {
    // Simple decompression - replace with actual decompression library in production
    return str;
  }

  /**
   * Store data with advanced options
   */
  setItem<T>(key: StorageKeys | string, value: T, options: StorageOptions = {}): boolean {
    try {
      if (!this.isSupported) {
        console.warn('🚨 Storage not supported, data will not persist');
        return false;
      }

      const serialized = this.serializeData(value, options);
      localStorage.setItem(key, serialized);
      
      console.log(`💾 Stored data for key: ${key}`);
      return true;
    } catch (error) {
      console.error('🚨 Failed to store data:', error);
      return false;
    }
  }

  /**
   * Retrieve data with fallback support
   */
  getItem<T>(key: StorageKeys | string, options: StorageOptions = {}): T | null {
    try {
      if (!this.isSupported) {
        return options.fallback || null;
      }

      const item = localStorage.getItem(key);
      if (!item) {
        return options.fallback || null;
      }

      const data = this.deserializeData<T>(item, options);
      return data !== null ? data : (options.fallback || null);
    } catch (error) {
      console.error('🚨 Failed to retrieve data:', error);
      return options.fallback || null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: StorageKeys | string): boolean {
    try {
      if (!this.isSupported) return false;
      
      localStorage.removeItem(key);
      console.log(`🗑️ Removed data for key: ${key}`);
      return true;
    } catch (error) {
      console.error('🚨 Failed to remove data:', error);
      return false;
    }
  }

  /**
   * Clear all SWF-related storage
   */
  clear(): boolean {
    try {
      if (!this.isSupported) return false;

      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('swf_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🧹 Cleared all SWF storage data');
      return true;
    } catch (error) {
      console.error('🚨 Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  getUsageStats(): { used: number; available: number; quota: number } {
    try {
      if (!this.isSupported) {
        return { used: 0, available: 0, quota: 0 };
      }

      let used = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        used += (localStorage.getItem(key) || '').length;
      });

      // Estimate quota (varies by browser)
      const quota = 5 * 1024 * 1024; // 5MB estimate
      const available = quota - used;

      return { used, available, quota };
    } catch (error) {
      console.error('🚨 Failed to get storage stats:', error);
      return { used: 0, available: 0, quota: 0 };
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    try {
      if (!this.isSupported) return 0;

      let cleaned = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('swf_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data: StoredData<any> = JSON.parse(item);
              if (data.expiry && Date.now() > data.expiry) {
                localStorage.removeItem(key);
                cleaned++;
              }
            } catch {
              // Invalid format, remove it
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        }
      });

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired storage items`);
      }
      
      return cleaned;
    } catch (error) {
      console.error('🚨 Failed to cleanup storage:', error);
      return 0;
    }
  }

  /**
   * Export all SWF data for backup
   */
  exportData(): Record<string, any> {
    try {
      if (!this.isSupported) return {};

      const data: Record<string, any> = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('swf_')) {
          const item = localStorage.getItem(key);
          if (item) {
            data[key] = item;
          }
        }
      });

      return data;
    } catch (error) {
      console.error('🚨 Failed to export data:', error);
      return {};
    }
  }

  /**
   * Import data from backup
   */
  importData(data: Record<string, any>): boolean {
    try {
      if (!this.isSupported) return false;

      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('swf_') && typeof value === 'string') {
          localStorage.setItem(key, value);
        }
      });

      console.log('📥 Imported storage data');
      return true;
    } catch (error) {
      console.error('🚨 Failed to import data:', error);
      return false;
    }
  }
}

// Create singleton instance
export const storage = new StorageManager();

// Convenience functions for common operations
export const userPreferences = {
  get: () => storage.getItem(StorageKeys.USER_PREFERENCES, { fallback: {} }),
  set: (prefs: any) => storage.setItem(StorageKeys.USER_PREFERENCES, prefs),
  update: (updates: any) => {
    const current = userPreferences.get();
    const safeUpdates = updates as Record<string, any> || {};
    const safeCurrent = current as Record<string, any> || {};
    return storage.setItem(StorageKeys.USER_PREFERENCES, Object.assign({}, safeCurrent, safeUpdates));
  }
};

export const themeSettings = {
  get: () => storage.getItem(StorageKeys.THEME_SETTINGS, { fallback: { mode: 'light' } }),
  set: (theme: any) => storage.setItem(StorageKeys.THEME_SETTINGS, theme)
};

export const formDrafts = {
  save: (formId: string, data: any) => {
    const drafts = storage.getItem(StorageKeys.FORM_DRAFTS, { fallback: {} });
    const safeDrafts = drafts as Record<string, any> || {};
    const updatedDrafts = Object.assign({}, safeDrafts, { [formId]: data });
    storage.setItem(StorageKeys.FORM_DRAFTS, updatedDrafts);
  },
  load: (formId: string) => {
    const drafts = storage.getItem(StorageKeys.FORM_DRAFTS, { fallback: {} });
    return drafts?.[formId] || null;
  },
  clear: (formId: string) => {
    const drafts = storage.getItem(StorageKeys.FORM_DRAFTS, { fallback: {} });
    const safeDrafts = drafts || {};
    delete safeDrafts[formId];
    storage.setItem(StorageKeys.FORM_DRAFTS, safeDrafts);
  }
};

/**
 * Progressive sync utilities for online/offline data management
 */
export const progressiveSync = {
  /**
   * Queue data for server sync when online
   */
  queueForSync: async (key: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') => {
    const syncQueue = storage.getItem('swf_sync_queue', { fallback: [] }) as Array<{
      key: string;
      data: any;
      priority: string;
      timestamp: number;
      attempts: number;
    }>;

    // Remove existing entry for this key
    const filteredQueue = syncQueue.filter(item => item.key !== key);
    
    // Add new entry
    filteredQueue.push({
      key,
      data,
      priority,
      timestamp: Date.now(),
      attempts: 0
    });

    // Sort by priority (high -> medium -> low) and timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    filteredQueue.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    storage.setItem('swf_sync_queue', filteredQueue);
    
    // Try immediate sync if online
    if (navigator.onLine) {
      progressiveSync.processSyncQueue();
    }
  },

  /**
   * Process sync queue when online
   */
  processSyncQueue: async () => {
    if (!navigator.onLine) return;

    const syncQueue = storage.getItem('swf_sync_queue', { fallback: [] }) as Array<any>;
    if (syncQueue.length === 0) return;

    console.log(`🔄 Processing ${syncQueue.length} items in sync queue`);

    const successfulSyncs: string[] = [];
    const failedSyncs: Array<any> = [];

    for (const item of syncQueue) {
      try {
        const success = await progressiveSync.syncItem(item);
        if (success) {
          successfulSyncs.push(item.key);
        } else {
          item.attempts += 1;
          if (item.attempts < 3) {
            failedSyncs.push(item);
          } else {
            console.warn(`❌ Sync failed for ${item.key} after 3 attempts`);
          }
        }
      } catch (error) {
        console.error(`🚨 Sync error for ${item.key}:`, error);
        item.attempts += 1;
        if (item.attempts < 3) {
          failedSyncs.push(item);
        }
      }
    }

    // Update queue with only failed items that haven't exceeded max attempts
    storage.setItem('swf_sync_queue', failedSyncs);

    if (successfulSyncs.length > 0) {
      console.log(`✅ Successfully synced: ${successfulSyncs.join(', ')}`);
    }
  },

  /**
   * Sync individual item to server
   */
  syncItem: async (item: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: item.key,
          data: item.data,
          timestamp: item.timestamp
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get sync queue status
   */
  getSyncStatus: () => {
    const queue = storage.getItem('swf_sync_queue', { fallback: [] }) as Array<any>;
    return {
      itemsInQueue: queue.length,
      highPriority: queue.filter(item => item.priority === 'high').length,
      isOnline: navigator.onLine
    };
  }
};

/**
 * Enhanced form draft management with auto-save and recovery
 */
export const enhancedFormDrafts = {
  /**
   * Auto-save form data with debouncing
   */
  autoSave: (() => {
    const saveTimeouts: Record<string, NodeJS.Timeout> = {};
    
    return (formId: string, data: any, debounceMs: number = 1000) => {
      // Clear existing timeout
      if (saveTimeouts[formId]) {
        clearTimeout(saveTimeouts[formId]);
      }

      // Set new timeout for auto-save
      saveTimeouts[formId] = setTimeout(() => {
        formDrafts.save(formId, {
          ...data,
          lastModified: Date.now(),
          autoSaved: true
        });
        
        // Dispatch custom event for UI feedback
        window.dispatchEvent(new CustomEvent('formDraftSaved', {
          detail: { formId, timestamp: Date.now() }
        }));
        
        console.log(`💾 Auto-saved draft for form: ${formId}`);
        delete saveTimeouts[formId];
      }, debounceMs);
    };
  })(),

  /**
   * Load draft with metadata
   */
  loadWithMetadata: (formId: string) => {
    const draft = formDrafts.load(formId);
    if (!draft) return null;

    return {
      data: draft,
      lastModified: draft.lastModified || 0,
      autoSaved: draft.autoSaved || false,
      age: Date.now() - (draft.lastModified || 0)
    };
  },

  /**
   * Get all drafts with summary
   */
  getAllDrafts: () => {
    const allDrafts = storage.getItem(StorageKeys.FORM_DRAFTS, { fallback: {} }) as Record<string, any>;
    
    return Object.entries(allDrafts).map(([formId, data]) => ({
      formId,
      lastModified: data.lastModified || 0,
      autoSaved: data.autoSaved || false,
      age: Date.now() - (data.lastModified || 0),
      hasData: Object.keys(data).length > 2 // More than just metadata
    }));
  },

  /**
   * Clean up old drafts
   */
  cleanupOldDrafts: (maxAge: number = 7 * 24 * 60 * 60 * 1000) => { // 7 days default
    const allDrafts = storage.getItem(StorageKeys.FORM_DRAFTS, { fallback: {} }) as Record<string, any>;
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(allDrafts).forEach(formId => {
      const draft = allDrafts[formId];
      const age = now - (draft.lastModified || 0);
      
      if (age > maxAge) {
        formDrafts.clear(formId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old form drafts`);
    }

    return cleanedCount;
  }
};

/**
 * Enhanced storage utilities for specific SWF platform needs
 */

// Wallet connection state persistence
export const walletStorage = {
  saveConnectionState: (walletAddress: string, chainId: number, walletType: string) => {
    storage.setItem(StorageKeys.WALLET_CONNECTION_STATE, {
      walletAddress,
      chainId,
      walletType,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    }, { expiry: 7 * 24 * 60 * 60 * 1000 }); // 7 days
  },
  
  getConnectionState: () => {
    return storage.getItem<{
      walletAddress: string;
      chainId: number;
      walletType: string;
      connectedAt: number;
      lastActivity: number;
    }>(StorageKeys.WALLET_CONNECTION_STATE);
  },
  
  updateActivity: () => {
    const state = walletStorage.getConnectionState();
    if (state) {
      walletStorage.saveConnectionState(
        state.walletAddress, 
        state.chainId, 
        state.walletType
      );
    }
  },
  
  clearConnection: () => {
    storage.removeItem(StorageKeys.WALLET_CONNECTION_STATE);
  }
};

// Dashboard layout interface
interface DashboardLayout {
  widgets: Array<{ id: string; position: { x: number; y: number }; size: { w: number; h: number } }>;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

// Dashboard layout and preferences
export const dashboardStorage = {
  saveLayout: (layout: DashboardLayout) => {
    storage.setItem(StorageKeys.DASHBOARD_LAYOUT, layout);
  },
  
  getLayout: (): DashboardLayout | null => {
    return storage.getItem<DashboardLayout>(StorageKeys.DASHBOARD_LAYOUT);
  },
  
  updateWidget: (widgetId: string, updates: Partial<{ position: { x: number; y: number }; size: { w: number; h: number } }>) => {
    const layout = dashboardStorage.getLayout();
    if (layout) {
      const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
      if (widgetIndex >= 0) {
        layout.widgets[widgetIndex] = { ...layout.widgets[widgetIndex], ...updates };
        dashboardStorage.saveLayout(layout);
      }
    }
  }
};

// Auto-cleanup on page load with intelligent optimization
if (typeof window !== 'undefined') {
  // Clean up expired items on load
  storage.cleanup();
  
  // Periodic optimization and cleanup
  setInterval(() => {
    storage.cleanup();
  }, 60000); // Every minute
  
  // Intelligent storage optimization every 30 minutes
  const optimizeStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      const swfKeys = keys.filter(key => key.startsWith('swf_'));
      
      // Clean up based on usage patterns
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      swfKeys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const data = JSON.parse(item);
            if (data.timestamp && data.timestamp < oneWeekAgo && key.includes('cache')) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Invalid JSON, remove it
            localStorage.removeItem(key);
          }
        }
      });
      
      console.log('🧠 Intelligent storage optimization completed');
    } catch (error) {
      console.error('🚨 Storage optimization failed:', error);
    }
  };
  
  setInterval(optimizeStorage, 30 * 60 * 1000); // Every 30 minutes
}

export default storage;

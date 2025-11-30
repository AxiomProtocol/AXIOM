import { useEffect, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * PWA installation and app-like features
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // PWA installed via Chrome
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // PWA installed via Safari
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Show install prompt after a delay (better UX)
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 30000); // 30 seconds
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      console.log('🎉 SWF PWA installed successfully!');
      
      // Track installation
      if ('gtag' in window) {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'successful'
        });
      }
    };

    checkInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('✅ User accepted PWA installation');
        setShowInstallPrompt(false);
        return true;
      } else {
        console.log('❌ User declined PWA installation');
        return false;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    } finally {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    
    // Don't show again for this session
    sessionStorage.setItem('swf-install-prompt-dismissed', 'true');
  }, []);

  return {
    isInstallable,
    isInstalled,
    showInstallPrompt,
    installApp,
    dismissInstallPrompt
  };
}

/**
 * App update detection and management
 */
export function useAppUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        console.log('🔄 New service worker activated');
        setUpdateAvailable(true);
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Check for waiting service worker
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      });

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const updateApp = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    setIsUpdating(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page to activate the new service worker
        window.location.reload();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('App update failed:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateAvailable,
    isUpdating,
    updateApp
  };
}

/**
 * Background sync for offline actions
 */
export function useBackgroundSync() {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>('idle');

  const registerBackgroundSync = useCallback(async (tag: string) => {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // Check if sync is supported on this registration
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log(`🔄 Background sync registered: ${tag}`);
        return true;
      } else {
        console.warn('Background sync not available on this registration');
        return false;
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, []);

  const queueAction = useCallback(async (action: any, tag: string = 'swf-background-sync') => {
    // Store action in IndexedDB or localStorage for service worker to process
    const actions = JSON.parse(localStorage.getItem('swf-pending-actions') || '[]');
    actions.push({
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now()
    });
    localStorage.setItem('swf-pending-actions', JSON.stringify(actions));
    
    // Register background sync
    await registerBackgroundSync(tag);
  }, [registerBackgroundSync]);

  useEffect(() => {
    // Listen for sync events from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_STATUS') {
        setSyncStatus(event.data.status);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    syncStatus,
    queueAction,
    registerBackgroundSync
  };
}

/**
 * App lifecycle and visibility management
 */
export function useAppLifecycle() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [appState, setAppState] = useState<'active' | 'passive' | 'hidden' | 'frozen' | 'terminated'>('active');

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      setAppState(visible ? 'active' : 'hidden');
      
      if (visible) {
        console.log('📱 App became visible');
        // Trigger data refresh if needed
        window.dispatchEvent(new CustomEvent('app-focus'));
      } else {
        console.log('📱 App became hidden');
        // Save state, pause non-critical operations
        window.dispatchEvent(new CustomEvent('app-blur'));
      }
    };

    const handlePageFreeze = () => {
      setAppState('frozen');
      console.log('🧊 App frozen (page lifecycle)');
    };

    const handlePageResume = () => {
      setAppState('active');
      console.log('🔄 App resumed (page lifecycle)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('freeze', handlePageFreeze);
    document.addEventListener('resume', handlePageResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handlePageFreeze);
      document.removeEventListener('resume', handlePageResume);
    };
  }, []);

  return {
    isVisible,
    appState,
    isActive: appState === 'active'
  };
}

/**
 * Push notifications management
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }, [isSupported]);

  const subscribeToPush = useCallback(async (vapidKey: string) => {
    if (!isSupported || permission !== 'granted') return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });
      
      setSubscription(subscription);
      console.log('📱 Push subscription created');
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, [isSupported, permission]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      console.log('📱 Push subscription cancelled');
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isSubscribed: !!subscription
  };
}

/**
 * Share API integration
 */
export function useNativeShare() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('share' in navigator);
  }, []);

  const share = useCallback(async (data: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    if (!isSupported) {
      // Fallback to clipboard
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(data.url || window.location.href);
        return { success: true, method: 'clipboard' };
      }
      return { success: false, error: 'Share not supported' };
    }

    try {
      await navigator.share({
        title: data.title || 'SWF - Sovran Wealth Fund',
        text: data.text || 'Check out my portfolio on SWF',
        url: data.url || window.location.href
      });
      
      return { success: true, method: 'native' };
    } catch (error) {
      console.error('Native share failed:', error);
      return { success: false, error };
    }
  }, [isSupported]);

  return {
    isSupported,
    share
  };
}

/**
 * PWA manifest management
 */
export function usePWAManifest() {
  const [manifest, setManifest] = useState<any>(null);

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const response = await fetch('/manifest.json');
        const manifestData = await response.json();
        setManifest(manifestData);
      } catch (error) {
        console.error('Failed to load manifest:', error);
      }
    };

    loadManifest();
  }, []);

  const updateManifest = useCallback((updates: Partial<any>) => {
    if (!manifest) return;

    const updatedManifest = { ...manifest, ...updates };
    setManifest(updatedManifest);
    
    // Update the manifest link in the document head
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      const blob = new Blob([JSON.stringify(updatedManifest)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      manifestLink.href = url;
    }
  }, [manifest]);

  return {
    manifest,
    updateManifest
  };
}

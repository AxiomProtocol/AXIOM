// AXIOM Platform Service Worker - Advanced Offline Support (WALLET FIX v5)
const CACHE_NAME = 'axiom-platform-v5-wallet-fix-nov23';
const RUNTIME_CACHE = 'axiom-runtime-v5-wallet-fix-nov23';
const API_CACHE = 'axiom-api-v5-wallet-fix-nov23';
const IMAGE_CACHE = 'axiom-images-v5-wallet-fix-nov23';
const PREFETCH_CACHE = 'axiom-prefetch-v5-wallet-fix-nov23';

// Critical resources to cache immediately (only existing files)
// REMOVED /dashboard - Let React router handle it dynamically
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/enhanced-staking',
  '/learn-how-it-works'
];

// API endpoints to cache (NEVER cache authentication endpoints for security)
// SECURITY: Only cache truly public, non-user-specific endpoints
const CACHEABLE_APIS = [
  '/api/platform-stats',
  '/api/public/pricing',
  '/api/public/announcements'
  // '/api/portfolio/summary' - REMOVED: Contains user-specific data, security risk
];

// Pages to prefetch when idle
const PREFETCH_PAGES = [
  '/airdrop',
  '/swf-banking',
  '/real-estate',
  '/sousou-circle',
  '/oracle-dashboard',
  '/dao-dashboard',
  '/risk-dashboard',
  '/gold-certificates',
  '/liquidity-management'
];

// Cache size limits
const CACHE_LIMITS = {
  [RUNTIME_CACHE]: 100,
  [API_CACHE]: 50,
  [IMAGE_CACHE]: 200,
  [PREFETCH_CACHE]: 20
};

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching critical resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete ALL old versions of caches (both swf- and axiom- prefixes)
              return (cacheName.startsWith('swf-') || cacheName.startsWith('axiom-')) && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== API_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== PREFETCH_CACHE;
            })
            .map(cacheName => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (unless they're API calls we want to cache)
  if (url.origin !== location.origin && !CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|woff|woff2)$/)) {
    // Static assets (JS/CSS/fonts) - cache first with update
    event.respondWith(handleStaticAsset(request));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) {
    // Images - cache first with size limit
    event.respondWith(handleImageRequest(request));
  } else {
    // Pages - network first with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Network first strategy for API requests
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      
      // Create new response with cache metadata (can't mutate immutable headers)
      const responseBody = await networkResponse.text();
      return new Response(responseBody, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cache': 'network'
        }
      });
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log(`🔄 Service Worker: Network failed for ${request.url}, trying cache`);
    
    // Try cache fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Create new response with cache metadata (can't mutate immutable headers)
      const responseBody = await cachedResponse.text();
      return new Response(responseBody, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'sw-cache': 'cache',
          'sw-cache-date': new Date().toISOString()
        }
      });
    }
    
    // Return offline response for critical APIs
    return createOfflineApiResponse(request);
  }
}

// Cache first strategy for static assets
async function handleStaticAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache immediately
    fetchAndUpdateCache(request, cache); // Update cache in background
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log(`⚠️ Service Worker: Failed to fetch static asset ${request.url}`);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Network first strategy for page requests
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log(`🔄 Service Worker: Network failed for ${request.url}, trying cache`);
    
    // Try cache fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return createOfflinePage();
    }
    
    return new Response('Page not available offline', { status: 404 });
  }
}

// Image request handler with size management
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache immediately
    fetchAndUpdateCache(request, cache); // Update cache in background
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Check cache size before adding
      await manageCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log(`⚠️ Service Worker: Failed to fetch image ${request.url}`);
    // Return placeholder image for failed images
    return createImagePlaceholder();
  }
}

// Cache size management
async function manageCacheSize(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Remove oldest entries (FIFO)
    const entriesToDelete = keys.length - maxEntries;
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`🧹 Service Worker: Cleaned up ${entriesToDelete} entries from ${cacheName}`);
  }
}

// Create placeholder for failed images
function createImagePlaceholder() {
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f3f4f6"/>
      <text x="100" y="100" text-anchor="middle" dy="0.3em" fill="#9ca3af" font-family="system-ui" font-size="12">
        Image unavailable
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    }
  });
}

// Background fetch and cache update
async function fetchAndUpdateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Smart prefetching when browser is idle
let prefetchQueue = [...PREFETCH_PAGES];
let prefetchInProgress = false;

async function startSmartPrefetch() {
  if (prefetchInProgress || prefetchQueue.length === 0) return;
  
  prefetchInProgress = true;
  console.log('🚀 Service Worker: Starting smart prefetch');
  
  const cache = await caches.open(PREFETCH_CACHE);
  
  // Prefetch up to 3 pages at a time to avoid overwhelming the network
  const batch = prefetchQueue.splice(0, 3);
  
  await Promise.all(batch.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`📦 Service Worker: Prefetched ${url}`);
      }
    } catch (error) {
      console.log(`⚠️ Service Worker: Failed to prefetch ${url}`);
    }
  }));
  
  prefetchInProgress = false;
  
  // Continue prefetching if more items in queue
  if (prefetchQueue.length > 0) {
    setTimeout(startSmartPrefetch, 2000); // Wait 2 seconds between batches
  }
}

// Start prefetching when service worker is idle
setTimeout(() => {
  if ('requestIdleCallback' in self) {
    self.requestIdleCallback(startSmartPrefetch);
  } else {
    setTimeout(startSmartPrefetch, 5000); // Fallback for browsers without requestIdleCallback
  }
}, 3000); // Wait 3 seconds after installation

// Create offline API response with fallback data
function createOfflineApiResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname === '/api/platform-stats') {
    return new Response(JSON.stringify({
      totalUsers: 0,
      activeWallets: 0,
      offline: true,
      message: 'Offline mode - showing cached data'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'sw-offline': 'true'
      }
    });
  }
  
  // SECURITY: Removed portfolio summary fallback - contains user-specific data
  
  return new Response(JSON.stringify({
    error: 'Service unavailable offline',
    offline: true
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'sw-offline': 'true'
    }
  });
}

// Create offline page
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Sovran Wealth Fund</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        p {
          font-size: 1.1rem;
          line-height: 1.6;
          opacity: 0.9;
          margin-bottom: 2rem;
        }
        .btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }
        .status {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>
          Don't worry! Some of your SWF Platform content is still available. 
          We'll automatically reconnect when your internet connection is restored.
        </p>
        <button class="btn" onclick="window.location.reload()">
          Try Again
        </button>
        <div class="status">
          <div id="network-status">Checking connection...</div>
        </div>
      </div>
      
      <script>
        // Monitor network status
        function updateNetworkStatus() {
          const status = document.getElementById('network-status');
          if (navigator.onLine) {
            status.textContent = '✅ Connection restored! Click "Try Again" to reload.';
            status.style.color = '#4ade80';
          } else {
            status.textContent = '📡 Still offline. Checking connection...';
            status.style.color = '#fbbf24';
          }
        }
        
        // Initial check
        updateNetworkStatus();
        
        // Listen for network changes
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // Auto-refresh when back online
        window.addEventListener('online', () => {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        });
      </script>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: {
      'Content-Type': 'text/html',
      'sw-offline': 'true'
    }
  });
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Process queued offline actions
async function handleBackgroundSync() {
  try {
    // Here you would process any queued offline actions
    // like form submissions, data updates, etc.
    console.log('🔄 Service Worker: Processing background sync');
    
    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_UPDATE':
      // Force cache update for specific resources
      handleCacheUpdate(data);
      break;
      
    case 'GET_CACHE_STATUS':
      // Send cache status back to client
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Handle cache updates
async function handleCacheUpdate(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`✅ Service Worker: Updated cache for ${url}`);
      }
    } catch (error) {
      console.error(`❌ Service Worker: Failed to update cache for ${url}`, error);
    }
  }
}

// Get cache status information
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {
    caches: cacheNames.length,
    lastUpdate: new Date().toISOString(),
    online: navigator.onLine
  };
  
  return status;
}

console.log('🚀 Service Worker: Script loaded and ready');
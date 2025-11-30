/* Advanced Error Capture Engine
   Intelligent error collection with context, performance, and user flow tracking
   Provides comprehensive error data for faster debugging and resolution
*/

class AdvancedErrorCapture {
  constructor(config = {}) {
    this.config = {
      enablePerformanceTracking: true,
      enableUserFlowTracking: true,
      enableStateCapture: true,
      maxUserFlowEvents: 50,
      maxStackTraceDepth: 50,
      debounceTime: 1000, // ms
      enableScreenshot: false, // Future feature
      ...config
    };
    
    this.userFlow = [];
    this.performanceObserver = null;
    this.sessionId = this.generateSessionId();
    this.errorQueue = [];
    this.isProcessing = false;
    
    this.initializeCapture();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  initializeCapture() {
    // Global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Performance tracking
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking();
    }
    
    // User interaction tracking
    if (this.config.enableUserFlowTracking) {
      this.initializeUserFlowTracking();
    }
    
    // Console error override
    this.overrideConsoleError();
  }

  handleGlobalError(event) {
    const errorData = {
      errorType: 'GlobalJavaScriptError',
      errorMessage: event.message || 'Unknown error',
      errorStack: event.error?.stack,
      sourceFile: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
      
      // Context
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      
      // Additional context
      elementTarget: event.target?.tagName || null,
      isTrusted: event.isTrusted,
      
      // Error object details
      errorName: event.error?.name,
      errorCause: event.error?.cause
    };

    this.captureError(errorData);
  }

  handleUnhandledRejection(event) {
    const errorData = {
      errorType: 'UnhandledPromiseRejection',
      errorMessage: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
      errorStack: event.reason?.stack,
      
      // Context
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      
      // Promise details
      promiseReason: typeof event.reason === 'object' ? JSON.stringify(event.reason, null, 2) : String(event.reason)
    };

    this.captureError(errorData);
  }

  overrideConsoleError() {
    const originalError = console.error;
    console.error = (...args) => {
      // Call original first
      originalError.apply(console, args);
      
      // Capture error details
      const errorData = {
        errorType: 'ConsoleError',
        errorMessage: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        errorStack: new Error().stack,
        
        // Context
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        
        // Console specific
        consoleArgs: args.slice(0, 5) // Limit to first 5 args
      };

      this.captureError(errorData);
    };
  }

  // React Error Boundary integration
  captureReactError(error, errorInfo, componentName = 'Unknown') {
    const errorData = {
      errorType: 'ReactComponentError',
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      
      // React specific context
      componentName,
      reactErrorBoundary: true,
      
      // Standard context
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    this.captureError(errorData);
  }

  // Main error capture method with intelligence
  async captureError(rawErrorData) {
    try {
      // Add comprehensive context
      const enrichedErrorData = {
        ...rawErrorData,
        
        // Session and user context
        sessionId: this.sessionId,
        userId: this.getCurrentUserId(),
        
        // Device and environment context
        viewport: this.getViewportInfo(),
        deviceInfo: this.getDeviceInfo(),
        browserInfo: this.getBrowserInfo(),
        platformInfo: this.getPlatformInfo(),
        
        // Application context
        appVersion: this.getAppVersion(),
        environment: this.getEnvironment(),
        feature: this.getCurrentFeature(),
        userAction: this.getLastUserAction(),
        
        // Performance context
        performanceImpact: this.config.enablePerformanceTracking ? 
          await this.getPerformanceMetrics() : null,
        
        // State snapshots
        componentState: this.config.enableStateCapture ? 
          this.getComponentState() : null,
        userFlow: this.config.enableUserFlowTracking ? 
          this.getUserFlow() : null,
        
        // Enhanced error details
        errorId: this.generateErrorId(),
        captureMethod: 'AdvancedErrorCapture',
        captureVersion: '2.0'
      };

      // Add to processing queue
      this.errorQueue.push(enrichedErrorData);
      
      // Process queue (debounced)
      if (!this.isProcessing) {
        setTimeout(() => this.processErrorQueue(), this.config.debounceTime);
        this.isProcessing = true;
      }
      
    } catch (captureError) {
      console.error('Error in captureError:', captureError);
      // Fallback: send basic error data
      this.sendErrorData(rawErrorData);
    }
  }

  async processErrorQueue() {
    if (this.errorQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // Group and deduplicate similar errors
    const groupedErrors = this.groupSimilarErrors(errors);
    
    // Send each group
    for (const errorGroup of groupedErrors) {
      await this.sendErrorData(errorGroup);
    }

    this.isProcessing = false;

    // Process remaining errors if any
    if (this.errorQueue.length > 0) {
      setTimeout(() => this.processErrorQueue(), this.config.debounceTime);
      this.isProcessing = true;
    }
  }

  groupSimilarErrors(errors) {
    const groups = new Map();
    
    for (const error of errors) {
      const key = `${error.errorType}:${error.errorMessage}:${error.sourceFile}:${error.lineNumber}`;
      
      if (groups.has(key)) {
        const existing = groups.get(key);
        existing.errorCount = (existing.errorCount || 1) + 1;
        existing.occurrences = existing.occurrences || [];
        existing.occurrences.push({
          timestamp: error.timestamp,
          userAction: error.userAction
        });
      } else {
        groups.set(key, { ...error, errorCount: 1 });
      }
    }
    
    return Array.from(groups.values());
  }

  async sendErrorData(errorData) {
    try {
      const response = await fetch('/api/errors/advanced-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Advanced error reported:', result);
      
    } catch (sendError) {
      console.error('❌ Failed to send error data:', sendError);
      
      // Store locally for retry
      this.storeErrorLocally(errorData);
    }
  }

  storeErrorLocally(errorData) {
    try {
      const stored = JSON.parse(localStorage.getItem('advancedErrorCapture_queue') || '[]');
      stored.push({
        ...errorData,
        storedAt: Date.now()
      });
      
      // Keep last 100 errors
      const recentErrors = stored.slice(-100);
      localStorage.setItem('advancedErrorCapture_queue', JSON.stringify(recentErrors));
      
    } catch (storageError) {
      console.error('Failed to store error locally:', storageError);
    }
  }

  // Context gathering methods
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || 'unknown'
    };
  }

  getDeviceInfo() {
    return {
      memory: navigator.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown',
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      platform: navigator.platform,
      languages: navigator.languages
    };
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    return {
      userAgent: ua,
      vendor: navigator.vendor,
      product: navigator.product,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      doNotTrack: navigator.doNotTrack
    };
  }

  getPlatformInfo() {
    return {
      os: this.detectOS(),
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  detectOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  getCurrentUserId() {
    // Try to get from various sources
    return localStorage.getItem('userId') || 
           sessionStorage.getItem('userId') || 
           window.currentUser?.id ||
           'anonymous';
  }

  getAppVersion() {
    return process.env.REACT_APP_VERSION || 
           window.APP_VERSION || 
           'unknown';
  }

  getEnvironment() {
    return process.env.NODE_ENV || 
           window.ENV ||
           (window.location.hostname === 'localhost' ? 'development' : 'production');
  }

  getCurrentFeature() {
    // Extract feature from URL or component context
    const path = window.location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/banking')) return 'banking';
    if (path.includes('/market')) return 'market';
    return 'unknown';
  }

  getLastUserAction() {
    return this.userFlow.length > 0 ? 
      this.userFlow[this.userFlow.length - 1]?.action : 
      'unknown';
  }

  getUserFlow() {
    return this.userFlow.slice(-10); // Last 10 actions
  }

  getComponentState() {
    // Try to get React component state if available
    try {
      // This would need React DevTools or custom integration
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? 
        'React state capture not implemented' : null;
    } catch {
      return null;
    }
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  // Performance tracking
  initializePerformanceTracking() {
    try {
      // Web Vitals tracking
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceEntry(entry);
          }
        });
        
        this.performanceObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      }
    } catch (error) {
      console.warn('Performance tracking unavailable:', error);
    }
  }

  recordPerformanceEntry(entry) {
    // Store performance entries for correlation with errors
    if (!window.performanceEntries) {
      window.performanceEntries = [];
    }
    
    window.performanceEntries.push({
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: Date.now()
    });
    
    // Keep last 100 entries
    window.performanceEntries = window.performanceEntries.slice(-100);
  }

  async getPerformanceMetrics() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        // Core Web Vitals (approximate)
        lcp: this.getLCP(),
        fid: this.getFID(),
        cls: this.getCLS(),
        
        // Navigation timing
        ttfb: navigation ? navigation.responseStart - navigation.requestStart : null,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : null,
        loadComplete: navigation ? navigation.loadEventEnd - navigation.navigationStart : null,
        
        // Paint timing
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
        
        // Memory (if available)
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      };
    } catch (error) {
      console.warn('Performance metrics unavailable:', error);
      return null;
    }
  }

  getLCP() {
    const lcpEntries = window.performanceEntries?.filter(entry => 
      entry.entryType === 'largest-contentful-paint'
    ) || [];
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;
  }

  getFID() {
    const fidEntries = window.performanceEntries?.filter(entry => 
      entry.entryType === 'first-input'
    ) || [];
    return fidEntries.length > 0 ? fidEntries[0].processingStart - fidEntries[0].startTime : null;
  }

  getCLS() {
    // CLS calculation would require layout shift tracking
    // This is a simplified version
    return window.cumulativeLayoutShift || null;
  }

  // User flow tracking
  initializeUserFlowTracking() {
    const eventTypes = ['click', 'input', 'scroll', 'keydown', 'submit'];
    
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.recordUserAction(eventType, event);
      }, { passive: true });
    });
    
    // Page navigation
    window.addEventListener('popstate', () => {
      this.recordUserAction('navigation', { url: window.location.href });
    });
  }

  recordUserAction(action, event) {
    const actionData = {
      action,
      timestamp: Date.now(),
      target: event.target ? {
        tagName: event.target.tagName,
        id: event.target.id,
        className: event.target.className,
        textContent: event.target.textContent?.slice(0, 50)
      } : null,
      url: window.location.href
    };
    
    this.userFlow.push(actionData);
    
    // Keep only recent actions
    if (this.userFlow.length > this.config.maxUserFlowEvents) {
      this.userFlow = this.userFlow.slice(-this.config.maxUserFlowEvents);
    }
  }

  // Public API for manual error reporting
  reportError(error, context = {}) {
    const errorData = {
      errorType: 'ManualReport',
      errorMessage: error.message || String(error),
      errorStack: error.stack,
      ...context
    };
    
    this.captureError(errorData);
  }

  // Configuration methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Remove event listeners
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }
}

// Initialize global instance
window.AdvancedErrorCapture = AdvancedErrorCapture;

export default AdvancedErrorCapture;
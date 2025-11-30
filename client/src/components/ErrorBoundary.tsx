import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { storage, StorageKeys } from '../utils/storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'section';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Enhanced Error Boundary with reporting and recovery
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
    
    // Add global error capture for Web3 browser debugging
    this.setupGlobalErrorCapture();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Enhanced error logging with more details
    console.error('🚨 Error Boundary caught an error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    console.error('📍 Full Error Object:', error);
    console.error('📍 Full Error Info:', errorInfo);

    // Store error for reporting
    this.logError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to external service (if configured)
    this.reportError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorId: this.state.errorId
      };

      // Store error logs locally - properly type the storage return
      const existingLogs = storage.getItem<{ errors: any[] }>(StorageKeys.PERFORMANCE_METRICS, { fallback: { errors: [] } }) || { errors: [] };
      const updatedLogs = {
        ...existingLogs,
        errors: [...(existingLogs.errors || []), errorLog].slice(-50) // Keep last 50 errors
      };
      
      storage.setItem(StorageKeys.PERFORMANCE_METRICS, updatedLogs);
    } catch (logError) {
      console.error('🚨 Failed to log error:', logError);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Always enable reporting in development mode to debug section errors
      console.log('🔥 ErrorBoundary attempting to report error:', { 
        message: error.message, 
        stack: error.stack?.substring(0, 200),
        level: this.props.level 
      });

      // Report to your error tracking service
      // Example: Sentry, LogRocket, etc.
      const errorReport = {
        errorType: 'React.Component',
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        level: this.props.level,
        timestamp: Date.now(),
        errorId: this.state.errorId,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          retryCount: this.retryCount
        }
      };

      // Use advanced error reporting
      const advancedErrorReport = {
        errorType: 'ReactComponentError',
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        sourceFile: this.extractSourceFile(error.stack),
        lineNumber: this.extractLineNumber(error.stack),
        columnNumber: this.extractColumnNumber(error.stack),
        
        // Context information
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userId: this.getCurrentUserId(),
        
        // Application context
        feature: this.getCurrentFeature(),
        userAction: 'component_error',
        
        // Component context
        componentName: this.props.componentName || 'UnknownComponent',
        level: this.props.level || 'component',
        errorId: this.state.errorId,
        retryCount: this.retryCount,
        
        // Enhanced context
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        },
        deviceInfo: {
          memory: navigator.deviceMemory || 'unknown',
          cores: navigator.hardwareConcurrency || 'unknown',
          platform: navigator.platform
        },
        browserInfo: {
          vendor: navigator.vendor,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        }
      };

      await fetch('/api/errors/advanced-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advancedErrorReport)
      }).then(response => {
        console.log('✅ Advanced error reported successfully, status:', response.status);
        return response.json();
      }).then(data => {
        console.log('📤 Advanced error report response:', data);
        if (data.intelligence) {
          console.log('🧠 Error intelligence:', data.intelligence);
        }
      }).catch(err => {
        // Enhanced error reporting debug
        console.error('❌ Advanced error reporting failed:', err);
        console.log('📡 Advanced error report payload was:', JSON.stringify(advancedErrorReport, null, 2));
        
        // Fallback to legacy error reporting
        return this.fallbackErrorReport(error, errorInfo);
      });
    } catch (reportingError) {
      console.error('🚨 Error reporting failed:', reportingError);
    }
  }

  // Helper methods for advanced error reporting
  private extractSourceFile(stack?: string): string | null {
    if (!stack) return null;
    const match = stack.match(/https?:\/\/[^\/]+\/static\/js\/[^:]+\.js/);
    return match ? match[0] : null;
  }

  private extractLineNumber(stack?: string): number | null {
    if (!stack) return null;
    const match = stack.match(/:(\d+):\d+/);
    return match ? parseInt(match[1]) : null;
  }

  private extractColumnNumber(stack?: string): number | null {
    if (!stack) return null;
    const match = stack.match(/:(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('errorBoundarySessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      sessionStorage.setItem('errorBoundarySessionId', sessionId);
    }
    return sessionId;
  }

  private getCurrentUserId(): string | null {
    return localStorage.getItem('userId') || 
           sessionStorage.getItem('userId') || 
           null;
  }

  private getCurrentFeature(): string {
    const path = window.location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/banking')) return 'banking';
    if (path.includes('/market')) return 'market';
    if (path.includes('/real-estate')) return 'real-estate';
    if (path.includes('/defi')) return 'defi';
    return 'unknown';
  }

  private async fallbackErrorReport(error: Error, errorInfo: ErrorInfo) {
    try {
      const fallbackReport = {
        errorType: 'ReactError',
        errorMessage: error.message,
        errorStack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: null,
        additionalInfo: {
          componentStack: errorInfo.componentStack,
          level: this.props.level,
          errorId: this.state.errorId,
          retryCount: this.retryCount
        }
      };

      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackReport)
      });
      
      console.log('✅ Fallback error report sent');
    } catch (fallbackError) {
      console.error('❌ Fallback error reporting also failed:', fallbackError);
    }
  }

  private setupGlobalErrorCapture() {
    // Only add global error capture in Web3 browsers for debugging
    const isWeb3Browser = /MetaMask|Binance|TrustWallet|Web3|DApp|TokenPocket|imToken/i.test(navigator.userAgent);
    if (!isWeb3Browser || process.env.NODE_ENV !== 'development') return;

    // Global error handler for unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('🌍 Global Error Captured:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    });

    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🌍 Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      // Prevent the default browser behavior of logging to console
      // event.preventDefault();
    });

    console.log('🔍 Global error capture enabled for Web3 browser debugging');
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Retrying component render (attempt ${this.retryCount}/${this.maxRetries})`);
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    if (this.state.errorId) {
      // Copy error ID to clipboard
      navigator.clipboard?.writeText(this.state.errorId).then(() => {
        alert('Error ID copied to clipboard. Please share this with support.');
      }).catch(() => {
        alert(`Error ID: ${this.state.errorId}\nPlease share this with support.`);
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { level = 'component' } = this.props;
    const { error, errorId } = this.state;
    const canRetry = this.retryCount < this.maxRetries;

    if (level === 'section') {
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-center mb-2">
            <div className="text-red-500 mr-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-red-800 font-semibold">Section Error</h3>
          </div>
          <p className="text-red-700 text-sm mb-3">
            This section encountered an error and couldn't load properly.
          </p>
          
          {/* Show error details in development for Web3 browsers */}
          {error && process.env.NODE_ENV === 'development' && (
            <div className="bg-red-100 rounded p-2 mb-3 text-left">
              <h4 className="font-semibold text-xs text-red-800 mb-1">Debug Info:</h4>
              <pre className="text-xs text-red-700 overflow-auto max-h-20">
                {error.message}\n{error.stack?.split('\n').slice(0, 3).join('\n')}
              </pre>
            </div>
          )}
          
          <div className="flex gap-2">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => console.log('🚨 Section Error Details:', { error, errorInfo: this.state.errorInfo })}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Debug Log
              </button>
            )}
          </div>
        </div>
      );
    }

    if (level === 'component') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 my-2">
          <div className="flex items-center mb-2">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <span className="text-yellow-800 font-medium text-sm">Component Error</span>
          </div>
          <p className="text-yellow-700 text-xs mb-2">
            A component failed to render properly.
          </p>
          {canRetry && (
            <button
              onClick={this.handleRetry}
              className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    // Page level error
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="text-red-500 text-6xl mb-4">💥</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Our team has been notified and we're working to fix it.
          </p>

          {error && process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Error Details:</h3>
              <pre className="text-xs text-gray-600 overflow-auto">
                {error.message}
              </pre>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again ({this.maxRetries - this.retryCount} left)
              </button>
            )}
            
            <button
              onClick={this.handleReload}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Reload Page
            </button>
          </div>

          {errorId && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
              </p>
              <button
                onClick={this.handleReport}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Report this error
              </button>
            </div>
          )}

          <div className="mt-6">
            <Link 
              to="/" 
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Specialized error boundaries for different scenarios
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ErrorBoundary level="component" fallback={fallback}>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section">
    {children}
  </ErrorBoundary>
);

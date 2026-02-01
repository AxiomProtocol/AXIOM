import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      fetch('/api/admin/log-client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusCode: 500,
          message: error.message,
          url: window.location.href,
          userAgent: navigator.userAgent,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
              <Link 
                href="/"
                className="inline-block border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Go Home
              </Link>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 text-left bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-mono text-red-800">{this.state.error.message}</p>
                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

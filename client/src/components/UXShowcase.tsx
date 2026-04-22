import React, { useState, useEffect } from 'react';
import { usePullToRefresh } from '../hooks/useMobileEnhancements';
import { useIntersectionObserver, usePerformanceMonitor } from '../hooks/usePerformanceOptimizations';
import { usePWAInstall, useAppUpdates } from '../hooks/usePWAFeatures';
import { useAutoComplete, useRecentItems, useThemePreferences, useDashboardWidgets } from '../hooks/useSmartFeatures';
import { useAutoSave } from '../hooks/useAutoSave';
import { useAccessibility } from '../hooks/useAccessibility';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { FadeTransition, SlideTransition } from './ui/transitions';
import { LoadingSpinner, SmartLoading } from './ui/loading-states';
import { Skeleton, SkeletonCard } from './ui/skeleton';

/**
 * Comprehensive UX Showcase demonstrating all enhanced features
 */
export function UXShowcase() {
  const [isLoading, setIsLoading] = useState(true);
  const [demoData, setDemoData] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Performance monitoring
  const { metrics, suggestions, markFeature } = usePerformanceMonitor();

  // Mobile enhancements
  const pullToRefresh = usePullToRefresh(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🔄 Pull to refresh completed!');
  });

  // Intersection observer for animations
  const { targetRef, shouldAnimate } = useIntersectionObserver();

  // PWA features
  const { isInstallable, showInstallPrompt, installApp, dismissInstallPrompt } = usePWAInstall();
  const { updateAvailable, updateApp } = useAppUpdates();

  // Smart features
  const walletAddresses = [
    '0x742d35Cc6634C0532925a3b8D',
    '0x8ba1f109551bD432803012645',
    '0x123456789abcdef123456789a'
  ];
  const autoComplete = useAutoComplete(walletAddresses, { fuzzyMatch: true });
  const { recentItems, addRecentItem } = useRecentItems<{ id: string; label: string }>('demo-items');
  const { preferences, actualTheme, updatePreferences } = useThemePreferences();
  const { widgets, addWidget, updateWidget } = useDashboardWidgets();

  // Auto-save for demo form
  const { isSaving, hasUnsavedChanges } = useAutoSave({
    data: { demoData, searchQuery },
    saveFunction: async (data) => {
      console.log('💾 Auto-saving demo data:', data);
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    delay: 2000
  });

  // Accessibility features
  const { announce, reduceMotion } = useAccessibility();

  // Network status
  const { isOnline } = useNetworkStatus();
  const connectionQuality = 'good'; // Default value since connectionQuality is not available

  useEffect(() => {
    const endMark = markFeature('ux-showcase');
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      announce('UX Showcase loaded successfully', 'polite');
      endMark();
    }, 2000);

    return endMark;
  }, [markFeature, announce]);

  const handleAddWidget = () => {
    const widgetId = addWidget({
      type: 'demo',
      title: 'Demo Widget',
      config: { theme: actualTheme }
    });
    announce(`Added new widget: ${widgetId}`, 'polite');
  };

  const handleSearchSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    addRecentItem({ id: suggestion, label: suggestion });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonCard />
          <SmartLoading />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={pullToRefresh.containerRef as React.RefObject<HTMLDivElement>}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300"
    >
      {/* Pull to refresh indicator */}
      {pullToRefresh.isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 transition-transform duration-200"
          style={{ transform: `translateY(${Math.min(pullToRefresh.pullDistance, 60)}px)` }}
        >
          {pullToRefresh.canRefresh ? '🔄 Release to refresh' : '⬇️ Pull to refresh'}
        </div>
      )}

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <FadeTransition show={true}>
          <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Install SWF App</h4>
                <p className="text-sm opacity-90">Get the full app experience</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={installApp}
                  className="bg-white text-blue-600 px-4 py-2 rounded font-medium"
                >
                  Install
                </button>
                <button 
                  onClick={dismissInstallPrompt}
                  className="text-white/80 px-2"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </FadeTransition>
      )}

      {/* App Update Available */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <span>🚀 App update available!</span>
            <button 
              onClick={updateApp}
              className="bg-white text-green-600 px-4 py-2 rounded font-medium"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        
        {/* Header with Status Indicators */}
        <div ref={targetRef as React.RefObject<HTMLDivElement>} className="text-center">
          <SlideTransition show={shouldAnimate && !reduceMotion} direction="up">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              SWF UX Enhancements Showcase
            </h1>
            <div className="flex justify-center items-center gap-4 text-sm">
              <span className={`flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isOnline ? `Online (${connectionQuality})` : 'Offline'}
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                🎨 Theme: {actualTheme}
              </span>
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 text-orange-600">
                  💾 {isSaving ? 'Saving...' : 'Unsaved changes'}
                </span>
              )}
            </div>
          </SlideTransition>
        </div>

        {/* Smart Search with Auto-complete */}
        <FadeTransition show={shouldAnimate}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              🧠 Smart Search with Auto-complete
            </h2>
            <div className="relative">
              <input
                type="text"
                value={autoComplete.query}
                onChange={(e) => autoComplete.setQuery(e.target.value)}
                onKeyDown={autoComplete.handleKeyDown}
                placeholder="Type a wallet address..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              {autoComplete.isOpen && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 
                               border border-gray-300 dark:border-gray-600 rounded-lg mt-1 shadow-lg z-10">
                  {autoComplete.suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearchSelect(suggestion)}
                      className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 
                                 ${index === autoComplete.selectedIndex ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {recentItems.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent:</h3>
                <div className="flex flex-wrap gap-2">
                  {recentItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearchSelect(item.label)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm
                                hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {item.label.slice(0, 10)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeTransition>

        {/* Auto-save Demo Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            💾 Auto-save Demo
          </h2>
          <textarea
            value={demoData}
            onChange={(e) => setDemoData(e.target.value)}
            placeholder="Type something... it will auto-save!"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-32 resize-none"
          />
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '⏳ Will save in 2 seconds' : '✅ Saved'}
          </div>
        </div>

        {/* Theme & Preferences */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🎨 Theme & Preferences
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => updatePreferences({ mode: 'light' })}
              className={`p-3 rounded-lg border ${preferences.mode === 'light' 
                ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 dark:bg-gray-700 border-gray-300'}`}
            >
              ☀️ Light
            </button>
            <button
              onClick={() => updatePreferences({ mode: 'dark' })}
              className={`p-3 rounded-lg border ${preferences.mode === 'dark' 
                ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 dark:bg-gray-700 border-gray-300'}`}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => updatePreferences({ mode: 'auto' })}
              className={`p-3 rounded-lg border ${preferences.mode === 'auto' 
                ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 dark:bg-gray-700 border-gray-300'}`}
            >
              🤖 Auto
            </button>
            <button
              onClick={() => updatePreferences({ compactMode: !preferences.compactMode })}
              className={`p-3 rounded-lg border ${preferences.compactMode 
                ? 'bg-green-100 border-green-500' : 'bg-gray-100 dark:bg-gray-700 border-gray-300'}`}
            >
              📱 Compact
            </button>
          </div>
        </div>

        {/* Dashboard Widgets */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📊 Customizable Widgets
            </h2>
            <button
              onClick={handleAddWidget}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Widget
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.slice(0, 6).map((widget) => (
              <div 
                key={widget.id}
                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{widget.title}</h3>
                  <button
                    onClick={() => updateWidget(widget.id, { isVisible: !widget.isVisible })}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {widget.isVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Widget type: {widget.type}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        {metrics.navigationTiming && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              ⚡ Performance Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart)}ms
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Load Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.paintTiming?.find(p => p.name === 'first-contentful-paint')?.startTime.toFixed(0) || 0}ms
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">First Paint</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.resourceTiming?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((metrics.memoryInfo?.usedJSHeapSize || 0) / 1024 / 1024)}MB
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Memory</div>
              </div>
            </div>
            
            {suggestions.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  💡 Performance Suggestions:
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Loading State Examples */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🔄 Loading States Demo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Standard Spinner</p>
            </div>
            <div>
              <Skeleton className="h-16 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Skeleton Loading</p>
            </div>
            <div>
              <SmartLoading />
              <p className="text-sm text-gray-600 dark:text-gray-400">Smart Loading</p>
            </div>
          </div>
        </div>

        {/* Mobile Features Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📱 Mobile Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Touch Gestures:</h3>
              <ul className="space-y-1">
                <li>• Pull down to refresh</li>
                <li>• Long press for context menu</li>
                <li>• Swipe for navigation</li>
                <li>• Pinch to zoom charts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">PWA Features:</h3>
              <ul className="space-y-1">
                <li>• Install prompt available</li>
                <li>• Offline support enabled</li>
                <li>• Background sync active</li>
                <li>• Push notifications ready</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

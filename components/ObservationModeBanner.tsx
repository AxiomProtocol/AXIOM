import React from 'react';
import Link from 'next/link';

interface ObservationModeBannerProps {
  variant?: 'warning' | 'info' | 'block';
}

const OBSERVATION_WINDOW = {
  active: true,
  startDate: '2026-01-26',
  minEndDate: '2026-03-26',
  maxEndDate: '2026-07-26',
};

export function ObservationModeBanner({ variant = 'warning' }: ObservationModeBannerProps) {
  if (!OBSERVATION_WINDOW.active) {
    return null;
  }

  if (variant === 'block') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Observation Window Active
          </h1>
          
          <p className="text-gray-600 mb-6">
            This feature is not available during the observation window. 
            Axiom Protocol is not accepting investments, deposits, or contributions at this time.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Window Period:</strong> {OBSERVATION_WINDOW.startDate} to {OBSERVATION_WINDOW.maxEndDate}
            </p>
          </div>
          
          <div className="space-y-3">
            <Link 
              href="/faq" 
              className="block w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
            >
              Learn More
            </Link>
            <Link 
              href="/observer" 
              className="block w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
            >
              View Observer Dashboard
            </Link>
            <Link 
              href="/" 
              className="block w-full px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'info') {
    return (
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-800 text-sm">
            <strong>Observation Window:</strong> Internal testing only. 
            <Link href="/faq" className="underline ml-1 hover:text-blue-900">
              Learn more
            </Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-amber-800 text-sm">
          <strong>Observation Window Active:</strong> No investments accepted at this time.
          <Link href="/faq" className="underline ml-1 hover:text-amber-900">
            Learn more
          </Link>
        </span>
      </div>
    </div>
  );
}

export function useObservationMode() {
  return {
    isActive: OBSERVATION_WINDOW.active,
    startDate: OBSERVATION_WINDOW.startDate,
    minEndDate: OBSERVATION_WINDOW.minEndDate,
    maxEndDate: OBSERVATION_WINDOW.maxEndDate,
    canAcceptInvestments: !OBSERVATION_WINDOW.active,
  };
}

export function ObservationModeGuard({ children }: { children: React.ReactNode }) {
  if (OBSERVATION_WINDOW.active) {
    return <ObservationModeBanner variant="block" />;
  }
  return <>{children}</>;
}

export default ObservationModeBanner;

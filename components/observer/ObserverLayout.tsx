import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

type Tab = 'overview' | 'treasury' | 'governance' | 'risk' | 'assets' | 'controls' | 'reports';

interface ObserverLayoutProps {
  title: string;
  description: string;
  currentTab: Tab;
  children: React.ReactNode;
}

function NavTabs({ current }: { current: Tab }) {
  const tabs: { id: Tab; label: string; href: string; icon: React.ReactNode }[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      href: '/observer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'treasury', 
      label: 'Treasury', 
      href: '/observer/treasury',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'governance', 
      label: 'Governance', 
      href: '/observer/governance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      id: 'risk', 
      label: 'Risk', 
      href: '/observer/risk',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    { 
      id: 'assets', 
      label: 'Assets', 
      href: '/observer/assets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      id: 'controls', 
      label: 'Controls', 
      href: '/observer/controls',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      href: '/observer/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="lg:w-48 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
            tab.id === current
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ObserverLayout({ title, description, currentTab, children }: ObserverLayoutProps) {
  return (
    <>
      <Head>
        <title>{title} | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-amber-800">
                  <strong>Read-Only Dashboard:</strong> No transaction signing or admin actions are possible from this interface.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <NavTabs current={currentTab} />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

export function ObserverCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

export function ObserverStatCard({
  label,
  value,
  subtitle,
  icon,
  color
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'yellow' | 'green' | 'purple' | 'blue' | 'red';
}) {
  const colorClasses = {
    yellow: 'text-amber-600 bg-amber-100',
    green: 'text-teal-600 bg-teal-100',
    purple: 'text-purple-600 bg-purple-100',
    blue: 'text-blue-600 bg-blue-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function ObserverLoading() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
    </div>
  );
}

export function ObserverError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-red-800">Error: {message}</p>
    </div>
  );
}

export function ProofLink({ type, value, label }: { type: 'tx' | 'address' | 'block'; value: string; label?: string }) {
  const baseUrl = 'https://arbiscan.io';
  const urlMap = {
    tx: `${baseUrl}/tx/${value}`,
    address: `${baseUrl}/address/${value}`,
    block: `${baseUrl}/block/${value}`
  };

  const shortValue = value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

  return (
    <a 
      href={urlMap[type]} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center text-amber-600 hover:text-amber-700 text-sm"
    >
      {label || shortValue}
      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

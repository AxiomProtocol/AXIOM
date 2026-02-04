import React, { useState, ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export interface TabConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  content?: ReactNode;
}

interface TabbedPageLayoutProps {
  title: string;
  description: string;
  tabs: TabConfig[];
  currentTab?: string;
  children?: ReactNode;
  variant?: 'horizontal' | 'sidebar';
  baseHref?: string;
  headerExtra?: ReactNode;
}

export function TabbedPageLayout({
  title,
  description,
  tabs,
  currentTab,
  children,
  variant = 'horizontal',
  baseHref,
  headerExtra,
}: TabbedPageLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(currentTab || tabs[0]?.id);

  const isLinkMode = tabs.some(tab => tab.href);
  const current = isLinkMode ? currentTab : activeTab;
  const currentTabConfig = tabs.find(t => t.id === current);

  const handleTabClick = (tab: TabConfig) => {
    if (tab.href) {
      router.push(tab.href);
    } else {
      setActiveTab(tab.id);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <Head>
          <title>{title} | AXIOM</title>
          <meta name="description" content={description} />
        </Head>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const isActive = tab.id === current;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                            isActive
                              ? 'bg-teal-50 text-teal-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {tab.icon && (
                            <span className={isActive ? 'text-teal-600' : 'text-gray-400'}>
                              {tab.icon}
                            </span>
                          )}
                          <span className="text-sm">{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <main className="flex-1 min-w-0">
                {headerExtra && (
                  <div className="mb-6">{headerExtra}</div>
                )}
                {children || currentTabConfig?.content}
              </main>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{title} | AXIOM</title>
        <meta name="description" content={description} />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
              {headerExtra && <div className="mt-4">{headerExtra}</div>}
            </div>

            <nav className="-mb-px flex space-x-1 overflow-x-auto pb-px">
              {tabs.map((tab) => {
                const isActive = tab.id === current;
                
                if (tab.href) {
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                        isActive
                          ? 'border-teal-600 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children || currentTabConfig?.content}
        </div>
      </div>
    </>
  );
}

export function TabIcon({ children }: { children: ReactNode }) {
  return <span className="w-5 h-5">{children}</span>;
}

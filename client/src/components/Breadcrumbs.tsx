import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

/**
 * Breadcrumb navigation component with automatic route detection
 */
export function Breadcrumbs({
  items,
  className,
  separator = (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  showHome = true
}: BreadcrumbsProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from current route if no items provided
  const breadcrumbItems = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className={cn("flex", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {showHome && !breadcrumbItems.some(item => item.href === '/') && (
          <>
            <li>
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="sr-only">Home</span>
              </Link>
            </li>
            <li className="flex items-center">
              {separator}
            </li>
          </>
        )}
        
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isCurrent = item.current || isLast;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mr-2">
                  {separator}
                </span>
              )}
              
              {isCurrent ? (
                <span
                  className="flex items-center space-x-1 text-gray-900 font-medium"
                  aria-current="page"
                >
                  {item.icon && <span className="text-gray-600">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              ) : (
                <Link
                  to={item.href || '#'}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumbs automatically from pathname
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return [];
  }

  const routeMap: Record<string, { label: string; icon?: React.ReactNode }> = {
    dashboard: { 
      label: 'Dashboard', 
      icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    'enhanced-staking': { 
      label: 'Enhanced Staking',
      icon: <span>💰</span>
    },
    airdrop: { 
      label: 'Airdrop',
      icon: <span>🎁</span>
    },
    'swf-banking': { 
      label: 'SWF Banking',
      icon: <span>🏦</span>
    },
    'real-estate': { 
      label: 'Real Estate',
      icon: <span>🏠</span>
    },
    'sousou-circle': { 
      label: 'SouSou Circle',
      icon: <span>👥</span>
    },
    'oracle-dashboard': { 
      label: 'Oracle Dashboard',
      icon: <span>🔮</span>
    },
    'dao-dashboard': { 
      label: 'DAO Dashboard',
      icon: <span>🗳️</span>
    },
    'risk-dashboard': { 
      label: 'Risk Management',
      icon: <span>⚠️</span>
    },
    'gold-certificates': { 
      label: 'Gold Certificates',
      icon: <span>🥇</span>
    },
    'liquidity-management': { 
      label: 'Liquidity Management',
      icon: <span>💧</span>
    },
    'admin-dashboard': { 
      label: 'Admin Panel',
      icon: <span>⚙️</span>
    },
    'learn-how-it-works': { 
      label: 'Learn How It Works',
      icon: <span>🎓</span>
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const routeInfo = routeMap[segment];
    
    breadcrumbs.push({
      label: routeInfo?.label || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      href: currentPath,
      icon: routeInfo?.icon,
      current: index === pathSegments.length - 1
    });
  });

  return breadcrumbs;
}

/**
 * Compact breadcrumbs for mobile/small screens
 */
interface CompactBreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  maxItems?: number;
}

export function CompactBreadcrumbs({
  items,
  className,
  maxItems = 2
}: CompactBreadcrumbsProps) {
  const location = useLocation();
  const breadcrumbItems = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  // Show only the last few items for mobile
  const visibleItems = breadcrumbItems.slice(-maxItems);
  const hasHiddenItems = breadcrumbItems.length > maxItems;

  return (
    <nav className={cn("flex items-center", className)} aria-label="Breadcrumb">
      <div className="flex items-center space-x-2 text-sm">
        {hasHiddenItems && (
          <>
            <button
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title={`${breadcrumbItems.length - maxItems} more levels`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
            <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </>
        )}
        
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              
              {isLast ? (
                <span className="text-gray-900 font-medium truncate max-w-[120px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href || '#'}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200 truncate max-w-[100px]"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

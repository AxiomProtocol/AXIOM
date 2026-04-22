"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { WalletConnectButton } from "../WalletConnect/WalletConnectButton";
import { SITE_NAV, NavItem, filterNavByVisibility } from "./SiteNavModel";

function useOutsideClick(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!ref.current) return;
      if (ref.current.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onClose]);
}

function trackNavClick(label: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'nav_click', {
      event_category: 'navigation',
      event_label: `nav_click_${label.toLowerCase().replace(/\s+/g, '_')}`
    });
  }
}

interface SiteHeaderProps {
  showWallet?: boolean;
}

export function SiteHeader({ showWallet = true }: SiteHeaderProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const router = useRouter();
  const pathname = router.pathname || "";
  const wrapRef = useRef<HTMLDivElement>(null);
  
  useOutsideClick(wrapRef as React.RefObject<HTMLElement>, () => setOpenLabel(null));

  useEffect(() => {
    setMobileOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  const navItems = filterNavByVisibility(SITE_NAV, 'public');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" onClick={() => trackNavClick('home')}>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
              <Image
                src="/images/axiom-token.png"
                alt="Axiom"
                width={36}
                height={36}
                className="rounded-full object-cover"
                priority
              />
              <span className="text-xl font-bold text-gray-900">Axiom</span>
            </div>
          </Link>

          <nav ref={wrapRef} className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <DesktopNavItem 
                key={item.label} 
                item={item} 
                openLabel={openLabel} 
                setOpenLabel={setOpenLabel}
                currentPath={pathname}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {showWallet && <WalletConnectButton />}
            
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100 animate-fadeIn">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <MobileNavItem
                  key={item.label}
                  item={item}
                  expanded={mobileExpanded}
                  setExpanded={setMobileExpanded}
                  currentPath={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function DesktopNavItem({ 
  item, 
  openLabel, 
  setOpenLabel,
  currentPath 
}: { 
  item: NavItem; 
  openLabel: string | null; 
  setOpenLabel: (v: string | null) => void;
  currentPath: string;
}) {
  const isOpen = openLabel === item.label;
  const isActive = item.href ? currentPath === item.href || currentPath.startsWith(item.href + '/') : false;

  if (!item.children || item.children.length === 0) {
    return (
      <Link 
        href={item.href || "/"} 
        onClick={() => trackNavClick(item.label)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'text-teal-600 bg-teal-50' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpenLabel(isOpen ? null : item.label)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
          isOpen ? 'text-teal-600 bg-teal-50' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
        }`}
      >
        {item.label}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => {
                trackNavClick(`${item.label}_${child.label}`);
                setOpenLabel(null);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileNavItem({
  item,
  expanded,
  setExpanded,
  currentPath,
  onNavigate
}: {
  item: NavItem;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  currentPath: string;
  onNavigate: () => void;
}) {
  const isExpanded = expanded === item.label;
  const isActive = item.href ? currentPath === item.href || currentPath.startsWith(item.href + '/') : false;

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href || "/"}
        onClick={() => {
          trackNavClick(item.label);
          onNavigate();
        }}
        className={`block px-4 py-3 rounded-lg text-base font-medium ${
          isActive ? 'text-teal-600 bg-teal-50' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(isExpanded ? null : item.label)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
      >
        {item.label}
        <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="pl-4 space-y-1 mt-1">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => {
                trackNavClick(`${item.label}_${child.label}`);
                onNavigate();
              }}
              className="block px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-teal-600"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default SiteHeader;

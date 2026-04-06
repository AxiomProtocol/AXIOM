import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { AuthButton } from './AuthButton';
import { NAV_ITEMS } from './navItems';
import { NavDropdown } from './NavDropdown';

interface DesignLawLayoutProps {
  children: ReactNode;
}

export function DesignLawLayout({ children }: DesignLawLayoutProps) {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimestamp(new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' ET');
  }, []);

  return (
    <div className="design-law-root min-h-screen bg-dl-bg">
      <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Axiom Protocol home">
            <div style={{ width: 42, height: 42, overflow: 'hidden', position: 'relative', flexShrink: 0, backgroundColor: '#050d1a' }}>
              <img
                src="/axiom-logo.png"
                alt="Axiom Protocol"
                style={{
                  position: 'absolute',
                  height: '260%',
                  width: 'auto',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -44%)',
                }}
              />
            </div>
            <span className="ml-2 font-dl-serif text-base text-dl-navy font-bold tracking-wide hidden sm:inline">
              AXIOM
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-dl-navy">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <NavDropdown key={item.label} item={item} />
              ) : (
                <Link key={item.href} href={item.href!} className="hover:underline">{item.label}</Link>
              )
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <AuthButton />
            </div>
            <div className="hidden lg:block">
              <ConnectWalletButton />
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-dl-navy border border-dl-border bg-dl-bg"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div
          className={`lg:hidden border-t border-dl-border bg-dl-bg overflow-y-auto transition-all duration-200 ease-in-out ${
            menuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 border-t-0 overflow-hidden'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.label} className="border-b border-dl-border last:border-b-0">
                  <p className="py-2 text-xs text-dl-gray uppercase tracking-wider font-dl-mono">{item.label}</p>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block min-h-[44px] flex items-center pl-4 text-sm text-dl-navy hover:underline"
                      onClick={() => setMenuOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  className="block min-h-[44px] flex items-center text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="pt-3 space-y-2">
              <AuthButton />
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="border-t border-dl-border pt-6 pb-8">
          <div className="flex flex-col md:flex-row md:justify-between gap-4 text-xs text-dl-gray">
            <div>
              <p>Axiom Protocol. Arbitrum One (Chain ID: 42161).</p>
              <p className="mt-1">This platform does not provide investment advice. All participation carries risk of loss.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4">
                <a
                  href="https://discord.gg/RPEnZ5Gfqe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-dl-navy hover:underline"
                >
                  <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor">
                    <path d="M60.1 4.9A58.5 58.5 0 0 0 45.4.2a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.5 37.5 0 0 0 25.4.3a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.5 4.9a.2.2 0 0 0-.1.1C1.5 18.7-.9 32.2.3 45.5v.2a58.9 58.9 0 0 0 17.7 9a.2.2 0 0 0 .3-.1 42.1 42.1 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.8 38.8 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.9a.2.2 0 0 1 .2 0 42 42 0 0 0 35.6 0 .2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.4 36.4 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .3.1A58.7 58.7 0 0 0 70.4 45.7v-.2c1.4-15-2.3-28-9.8-39.5a.2.2 0 0 0-.1-.1zM23.7 37.3c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.3 3.1 6.3 7-2.8 7-6.3 7zm23.2 0c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.3 3.1 6.3 7-2.8 7-6.3 7z"/>
                  </svg>
                  Discord
                </a>
                <a
                  href="https://x.com/FarmerFuqu97143"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-dl-navy hover:underline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X / Twitter
                </a>
                <a
                  href="https://www.linkedin.com/in/akiligroup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-dl-navy hover:underline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
              <p className="font-dl-mono">{timestamp}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

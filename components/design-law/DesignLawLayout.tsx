import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';

const NAV_LINKS = [
  { href: '/pilot', label: 'Capital Program' },
  { href: '/lending-fund', label: 'Lending Fund' },
  { href: '/dex', label: 'Exchange' },
  { href: '/mirdt', label: 'Intelligence' },
  { href: '/sentinel', label: 'Sentinel' },
  { href: '/observer', label: 'Observer' },
  { href: '/depin/denet', label: 'DePIN' },
  { href: '/founder-ops', label: 'Founder Ops' },
  { href: '/products', label: 'Products' },
  { href: '/solvency', label: 'Solvency' },
  { href: '/about-us', label: 'About' },
];

interface DesignLawLayoutProps {
  children: ReactNode;
}

export function DesignLawLayout({ children }: DesignLawLayoutProps) {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimestamp(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
  }, []);

  return (
    <div className="design-law-root min-h-screen bg-dl-bg">
      <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-dl-serif text-lg text-dl-navy font-bold">
            AXIOM
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-dl-navy">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline">{link.label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ConnectWalletButton />
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-dl-navy border border-dl-border bg-dl-bg"
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
        {menuOpen && (
          <div className="md:hidden border-t border-dl-border bg-dl-bg">
            <div className="max-w-7xl mx-auto px-6 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3">
                <ConnectWalletButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="border-t border-dl-border pt-6 pb-8">
          <div className="flex flex-col md:flex-row md:justify-between gap-4 text-xs text-dl-gray">
            <div>
              <p>Axiom Protocol. Arbitrum One (Chain ID: 42161).</p>
              <p className="mt-1">This platform does not provide investment advice. All participation carries risk of loss.</p>
            </div>
            <div className="text-right">
              <p className="font-dl-mono">{timestamp}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

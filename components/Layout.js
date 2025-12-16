import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WalletConnectButton } from './WalletConnect/WalletConnectButton';
import { NAV_ITEMS, FOOTER_ECOSYSTEM, FOOTER_RESOURCES, FOOTER_COMPANY } from '../lib/navigation';

export default function Layout({ children, showWallet = true }) {
  const [pathname, setPathname] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <Image
                  src="/images/axiom-token.png"
                  alt="Axiom Token"
                  width={40}
                  height={40}
                  className="rounded-full object-cover shadow-lg"
                  priority
                />
                <span className="text-xl font-bold text-gray-900">AXIOM</span>
              </div>
            </Link>
            
            <nav className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link 
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-medium transition-colors relative ${
                      isActive 
                        ? 'text-amber-600' 
                        : 'text-gray-600 hover:text-amber-600'
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-amber-500" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {showWallet && <WalletConnectButton />}
          </div>

          {/* Mobile Header - Stacked Layout */}
          <div className="md:hidden">
            {/* Row 1: Logo + Wallet Button */}
            <div className="flex items-center justify-between h-14">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                  <Image
                    src="/images/axiom-token.png"
                    alt="Axiom Token"
                    width={32}
                    height={32}
                    className="rounded-full object-cover shadow-lg"
                    priority
                  />
                  <span className="text-lg font-bold text-gray-900">AXIOM</span>
                </div>
              </Link>
              {showWallet && <WalletConnectButton />}
            </div>

            {/* Row 2: Horizontal Scrolling Navigation */}
            <div className="pb-3">
              <div 
                className="flex overflow-x-auto gap-2 -mx-4 px-4"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link 
                      key={item.name}
                      href={item.href}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                        isActive 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/">
                <div className="flex items-center gap-2 mb-4 cursor-pointer">
                  <Image
                    src="/images/axiom-token.png"
                    alt="Axiom Token"
                    width={32}
                    height={32}
                    className="rounded-full object-cover shadow-md"
                  />
                  <span className="font-bold text-gray-900">AXIOM</span>
                </div>
              </Link>
              <p className="text-sm text-gray-500">
                America's First On-Chain Smart City
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Ecosystem</h4>
              <div className="space-y-2">
                {FOOTER_ECOSYSTEM.map((item) => (
                  <Link key={item.href} href={item.href} className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">{item.name}</Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <div className="space-y-2">
                {FOOTER_RESOURCES.map((item) => (
                  <Link key={item.href} href={item.href} className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">{item.name}</Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <div className="space-y-2">
                {FOOTER_COMPANY.map((item) => (
                  <Link key={item.href} href={item.href} className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">{item.name}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2025 Axiom Smart City. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Deployed on</span>
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-600 text-sm font-medium">
                Arbitrum One
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

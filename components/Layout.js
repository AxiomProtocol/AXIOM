import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WalletConnectButton } from './WalletConnect/WalletConnectButton';
import { NAV_ITEMS, ADVANCED_DROPDOWN, MOBILE_NAV_ITEMS, FOOTER_ECOSYSTEM, FOOTER_RESOURCES, FOOTER_COMPANY } from '../lib/navigation';

export default function Layout({ children, showWallet = true }) {
  const [pathname, setPathname] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAdvanced && !e.target.closest('.advanced-dropdown')) {
        setShowAdvanced(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAdvanced]);
  
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
                
                if (item.isDropdown) {
                  return (
                    <div key={item.name} className="relative advanced-dropdown">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdvanced(!showAdvanced);
                        }}
                        className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                          showAdvanced ? 'text-amber-600' : 'text-gray-600 hover:text-amber-600'
                        }`}
                      >
                        {item.name}
                        <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showAdvanced && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                          {ADVANCED_DROPDOWN.map((dropItem) => (
                            <Link
                              key={dropItem.href}
                              href={dropItem.href}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              onClick={() => setShowAdvanced(false)}
                            >
                              {dropItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                
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
                {(MOBILE_NAV_ITEMS || NAV_ITEMS).map((item) => {
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
              <p className="text-sm text-gray-500 mb-4">
                Build wealth through discipline, structure, and community.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/AxiomProtocol/AXIOM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
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
              © 2025 Axiom Protocol. All rights reserved.
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

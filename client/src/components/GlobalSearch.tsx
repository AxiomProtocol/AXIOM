import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRecentlyViewed } from '../hooks/useLocalStorage';
import { ModalTransition, FadeTransition } from './ui/transitions';
import { LoadingSpinner } from './ui/loading-states';
import { cn } from '../lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'page' | 'feature' | 'help' | 'setting';
  keywords: string[];
  icon?: React.ReactNode;
  category?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Global search component with intelligent suggestions and keyboard navigation
 */
export function GlobalSearch({ isOpen, onClose, className }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { addToRecent, recentItems } = useRecentlyViewed<SearchResult>();

  // All searchable content - in a real app, this would come from an API
  const searchableContent: SearchResult[] = useMemo(() => [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View your portfolio overview, balances, and recent activity',
      url: '/dashboard',
      type: 'page',
      keywords: ['portfolio', 'balance', 'overview', 'stats', 'wealth'],
      icon: <span>📊</span>,
      category: 'Navigation'
    },
    {
      id: 'enhanced-staking',
      title: 'Enhanced Staking',
      description: 'Stake your SWF tokens to earn rewards and participate in governance',
      url: '/enhanced-staking',
      type: 'feature',
      keywords: ['stake', 'rewards', 'earn', 'governance', 'yield'],
      icon: <span>💰</span>,
      category: 'DeFi'
    },
    {
      id: 'airdrop',
      title: 'Airdrop Program',
      description: 'Claim your free SWF tokens and bonuses',
      url: '/airdrop',
      type: 'feature',
      keywords: ['airdrop', 'free', 'claim', 'bonus', 'tokens'],
      icon: <span>🎁</span>,
      category: 'Rewards'
    },
    {
      id: 'swf-banking',
      title: 'SWF Banking',
      description: 'Traditional banking services with crypto integration',
      url: '/swf-banking',
      type: 'feature',
      keywords: ['banking', 'savings', 'loans', 'debit', 'credit'],
      icon: <span>🏦</span>,
      category: 'Banking'
    },
    {
      id: 'real-estate',
      title: 'Real Estate Investment',
      description: 'Invest in tokenized real estate properties',
      url: '/real-estate',
      type: 'feature',
      keywords: ['real estate', 'property', 'investment', 'tokenized', 'reit'],
      icon: <span>🏠</span>,
      category: 'Investment'
    },
    {
      id: 'sousou-circle',
      title: 'SouSou Circle',
      description: 'Join rotating savings groups with friends and family',
      url: '/sousou-circle',
      type: 'feature',
      keywords: ['sousou', 'savings', 'group', 'circle', 'rotating'],
      icon: <span>👥</span>,
      category: 'Community'
    },
    {
      id: 'oracle-dashboard',
      title: 'Oracle Dashboard',
      description: 'Real-time price feeds and market data',
      url: '/oracle-dashboard',
      type: 'feature',
      keywords: ['oracle', 'price', 'feeds', 'market', 'data'],
      icon: <span>🔮</span>,
      category: 'Data'
    },
    {
      id: 'gold-certificates',
      title: 'Gold Certificates',
      description: 'Digital certificates backed by physical gold',
      url: '/gold-certificates',
      type: 'feature',
      keywords: ['gold', 'certificates', 'precious', 'metals', 'backed'],
      icon: <span>🥇</span>,
      category: 'Assets'
    },
    // Help and settings
    {
      id: 'help-wallet',
      title: 'How to Connect Wallet',
      description: 'Step-by-step guide to connect your crypto wallet',
      url: '/help/wallet-connection',
      type: 'help',
      keywords: ['wallet', 'connect', 'metamask', 'help', 'guide'],
      icon: <span>🔗</span>,
      category: 'Help'
    },
    {
      id: 'help-staking',
      title: 'Staking Guide',
      description: 'Learn how to stake your tokens effectively',
      url: '/help/staking-guide',
      type: 'help',
      keywords: ['staking', 'guide', 'tutorial', 'help', 'learn'],
      icon: <span>📚</span>,
      category: 'Help'
    },
    {
      id: 'settings-profile',
      title: 'Profile Settings',
      description: 'Manage your account preferences and security',
      url: '/settings/profile',
      type: 'setting',
      keywords: ['profile', 'settings', 'account', 'preferences', 'security'],
      icon: <span>⚙️</span>,
      category: 'Settings'
    }
  ], []);

  // Search function with fuzzy matching
  const performSearch = useMemo(() => {
    return (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim()) return [];
      
      const query = searchQuery.toLowerCase();
      const words = query.split(' ').filter(word => word.length > 0);
      
      return searchableContent
        .map(item => {
          let score = 0;
          const searchText = `${item.title} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();
          
          // Exact title match gets highest score
          if (item.title.toLowerCase().includes(query)) {
            score += 100;
          }
          
          // Keyword matches
          words.forEach(word => {
            if (item.keywords.some(keyword => keyword.includes(word))) {
              score += 50;
            }
            if (searchText.includes(word)) {
              score += 10;
            }
          });
          
          // Fuzzy matching for typos
          words.forEach(word => {
            if (word.length > 3) {
              const fuzzyMatches = searchText.split(' ').some(searchWord => 
                searchWord.length > 3 && levenshteinDistance(word, searchWord) <= 2
              );
              if (fuzzyMatches) {
                score += 5;
              }
            }
          });
          
          return { ...item, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    };
  }, [searchableContent]);

  // Handle search input
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      setShowSuggestions(true);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);
    
    // Debounce search
    const timer = setTimeout(() => {
      const searchResults = performSearch(query);
      setResults(searchResults);
      setSelectedIndex(0);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useKeyboardShortcuts([
    {
      key: 'ArrowDown',
      action: () => {
        const maxIndex = results.length - 1;
        setSelectedIndex(prev => prev < maxIndex ? prev + 1 : 0);
      },
      description: 'Navigate down in search results'
    },
    {
      key: 'ArrowUp',
      action: () => {
        const maxIndex = results.length - 1;
        setSelectedIndex(prev => prev > 0 ? prev - 1 : maxIndex);
      },
      description: 'Navigate up in search results'
    },
    {
      key: 'Enter',
      action: () => {
        if (results.length > 0 && selectedIndex >= 0) {
          handleSelectResult(results[selectedIndex]);
        }
      },
      description: 'Select highlighted search result'
    },
    {
      key: 'Escape',
      action: onClose,
      description: 'Close search'
    }
  ], {
    enabled: isOpen,
    target: { current: inputRef.current }
  });

  // Handle result selection
  const handleSelectResult = (result: SearchResult) => {
    addToRecent(result);
    navigate(result.url);
    onClose();
    setQuery('');
  };

  // Handle recent item click
  const handleRecentClick = (item: any) => {
    navigate(item.url);
    onClose();
  };

  // Get popular suggestions
  const popularSuggestions = useMemo(() => [
    'Dashboard',
    'Staking',
    'Real Estate',
    'Banking',
    'Airdrop'
  ], []);

  return (
    <ModalTransition show={isOpen} onClose={onClose}>
      <div className={cn(
        "relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4",
        "max-h-[80vh] overflow-hidden",
        className
      )}>
        {/* Search Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search SWF Platform..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
          
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span>Try: {popularSuggestions.join(', ')}</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+K</kbd>
          </div>
        </div>

        {/* Search Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-gray-500">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className={cn(
                    "w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors",
                    index === selectedIndex && "bg-blue-50 border-r-2 border-blue-500"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <span className={cn(
                          "ml-2 px-2 py-1 text-xs rounded-full",
                          result.type === 'page' && "bg-blue-100 text-blue-800",
                          result.type === 'feature' && "bg-green-100 text-green-800",
                          result.type === 'help' && "bg-yellow-100 text-yellow-800",
                          result.type === 'setting' && "bg-gray-100 text-gray-800"
                        )}>
                          {result.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {result.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No results found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-2">
                Try different keywords or check the help section
              </p>
            </div>
          ) : showSuggestions ? (
            <div className="py-4">
              {/* Recent items */}
              {recentItems.length > 0 && (
                <div className="px-6 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Recent
                  </h3>
                  {recentItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleRecentClick(item)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors mb-1"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">{item.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Popular searches */}
              <div className="px-6 py-2 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Popular
                </h3>
                {popularSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors mb-1"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="mr-1 px-1 bg-white rounded">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center">
                <kbd className="mr-1 px-1 bg-white rounded">↵</kbd>
                to select
              </span>
              <span className="flex items-center">
                <kbd className="mr-1 px-1 bg-white rounded">esc</kbd>
                to close
              </span>
            </div>
            <span>Powered by SWF Search</span>
          </div>
        </div>
      </div>
    </ModalTransition>
  );
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

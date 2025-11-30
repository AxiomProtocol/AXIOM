import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useWallet } from '../../contexts/WalletContext';
import { blockchainService, priceService } from '../../services/blockchainService';
import { useNotificationHelpers } from '../NotificationSystem';

interface InvestmentOpportunity {
  id: string;
  name: string;
  protocol: string;
  category: string;
  apy: number;
  risk: 'low' | 'medium' | 'high' | 'very-high';
  minimumInvestment: number;
  tvl: string;
  liquidityTerms: string;
  lockPeriod: string;
  description: string;
  detailedDescription: string;
  rewards: string[];
  benefits: string[];
  allocation?: string;
  poolShare?: number;
  multiplier?: number;
  rewardTokens?: string[];
  availableLP?: string;
  location?: string;
  propertyType?: string;
  backedBy?: string;
  minimumPurchase?: number;
  features?: string[];
}

interface InvestmentOpportunitiesProps {
  wealthData: any;
  contractData: any;
  onRefresh: () => void;
}

export function InvestmentOpportunities({ wealthData, contractData, onRefresh }: InvestmentOpportunitiesProps) {
  const { account, isConnected, userInfo } = useWallet();
  const { showWarning } = useNotificationHelpers();
  const [selectedCategory, setSelectedCategory] = useState<'defi' | 'staking' | 'yield' | 'trending' | 'real-estate' | 'gold'>('defi');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'very-high'>('all');
  const [sortBy, setSortBy] = useState<'apy' | 'risk' | 'minimum' | 'tvl' | 'name'>('apy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minInvestmentFilter, setMinInvestmentFilter] = useState<number>(0);
  const [maxInvestmentFilter, setMaxInvestmentFilter] = useState<number>(1000000);
  const [selectedOpportunity, setSelectedOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);

  // All opportunities data
  const [allOpportunities, setAllOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get real DeFi investment opportunities from blockchain
  const getRealInvestmentOpportunities = async (): Promise<InvestmentOpportunity[]> => {
    try {
      // Get real DeFi opportunities from blockchain service
      const realOpportunities = await blockchainService.getDeFiOpportunities();
      console.log('✅ Loaded real DeFi opportunities:', realOpportunities.length);
      return realOpportunities;
    } catch (error) {
      console.error('❌ Error loading real DeFi opportunities:', error);
      return [];
    }
  };

  // Backup static opportunities (only if blockchain fails)
  const getBackupOpportunities = (): InvestmentOpportunity[] => {
    return [
      // DeFi opportunities
      {
        id: 'swf-staking',
        name: 'SWF Token Staking',
        protocol: 'Sovran Wealth Fund',
        category: 'staking',
        apy: 12.8,
        risk: 'low',
        minimumInvestment: 1000,
        tvl: '$2.1M',
        liquidityTerms: '7-day unbonding period',
        lockPeriod: 'Flexible (7-day exit)',
        description: 'Stake SWF tokens to earn protocol fees and governance rewards',
        detailedDescription: 'Participate in the Sovran Wealth Fund ecosystem by staking SWF tokens. Earn consistent returns through protocol fee sharing and governance token rewards.',
        rewards: ['SWF tokens', 'Protocol fees', 'Governance tokens'],
        benefits: ['Governance rights', 'Fee sharing', 'Priority access', 'Deflationary tokenomics']
      },
      {
        id: 'pancakeswap-farming',
        name: 'PancakeSwap Farming',
        protocol: 'PancakeSwap',
        category: 'defi',
        apy: 18.5,
        risk: 'medium',
        minimumInvestment: 500,
        tvl: '$45.2M',
        liquidityTerms: 'Instant withdrawal',
        lockPeriod: 'None',
        description: 'Provide liquidity to earn farming rewards on PancakeSwap',
        detailedDescription: 'Earn high yields by providing liquidity to popular trading pairs on PancakeSwap DEX.',
        rewards: ['CAKE tokens', 'Trading fees'],
        benefits: ['High APY', 'No lock period', 'Instant liquidity']
      },
      {
        id: 'compound-lending',
        name: 'Compound Lending Pool',
        protocol: 'Compound',
        category: 'defi',
        apy: 8.2,
        risk: 'low',
        minimumInvestment: 100,
        tvl: '$120.8M',
        liquidityTerms: 'Anytime',
        lockPeriod: 'None',
        description: 'Lend assets to earn interest on Compound Protocol',
        detailedDescription: 'Supply assets to Compound lending pools and earn interest from borrowers.',
        rewards: ['Interest payments', 'COMP tokens'],
        benefits: ['Low risk', 'Flexible terms', 'Battle tested']
      },
      // Yield farming opportunities
      {
        id: 'aave-yield',
        name: 'Aave Yield Strategy',
        protocol: 'Aave',
        category: 'yield',
        apy: 15.3,
        risk: 'medium',
        minimumInvestment: 2000,
        tvl: '$89.4M',
        liquidityTerms: '24-hour notice',
        lockPeriod: 'None',
        description: 'Automated yield farming strategy on Aave protocol',
        detailedDescription: 'Sophisticated yield farming strategy that automatically optimizes returns across Aave lending and borrowing markets.',
        rewards: ['AAVE tokens', 'Optimized yields'],
        benefits: ['Auto-compounding', 'Risk management', 'Professional management']
      },
      {
        id: 'curve-3pool',
        name: 'Curve 3Pool Strategy',
        protocol: 'Curve Finance',
        category: 'yield',
        apy: 9.8,
        risk: 'low',
        minimumInvestment: 1000,
        tvl: '$156.7M',
        liquidityTerms: 'Instant',
        lockPeriod: 'None',
        description: 'Low-risk stablecoin yield farming on Curve Finance',
        detailedDescription: 'Earn stable yields by providing liquidity to Curve\'s flagship 3Pool (USDT, USDC, DAI).',
        rewards: ['CRV tokens', 'Trading fees'],
        benefits: ['Low impermanent loss', 'Stable returns', 'High liquidity']
      },
      // Real estate opportunities
      {
        id: 'miami-property-fund',
        name: 'Miami Real Estate Fund',
        protocol: 'RealT',
        category: 'real-estate',
        apy: 11.2,
        risk: 'medium',
        minimumInvestment: 5000,
        tvl: '$12.3M',
        liquidityTerms: '30-day notice',
        lockPeriod: '12 months',
        description: 'Invest in tokenized Miami real estate properties',
        detailedDescription: 'Gain exposure to Miami\'s growing real estate market through tokenized property investments.',
        rewards: ['Rental income', 'Property appreciation'],
        benefits: ['Real estate exposure', 'Passive income', 'Diversification'],
        location: 'Miami, FL',
        propertyType: 'Multi-family residential',
        features: ['Prime location', 'Professional management', 'Fractional ownership']
      },
      {
        id: 'reit-diversified',
        name: 'Diversified REIT Portfolio',
        protocol: 'BlockEstate',
        category: 'real-estate',
        apy: 8.9,
        risk: 'low',
        minimumInvestment: 2500,
        tvl: '$28.1M',
        liquidityTerms: '7-day notice',
        lockPeriod: '6 months',
        description: 'Diversified portfolio of tokenized REITs',
        detailedDescription: 'Invest in a professionally managed portfolio of real estate investment trusts.',
        rewards: ['Dividend payments', 'Capital appreciation'],
        benefits: ['Diversification', 'Professional management', 'Lower volatility'],
        location: 'Global',
        propertyType: 'Mixed commercial/residential'
      },
      // Gold and precious metals
      {
        id: 'gold-certificates',
        name: 'Gold-Backed Certificates',
        protocol: 'GoldToken',
        category: 'gold',
        apy: 3.2,
        risk: 'low',
        minimumInvestment: 1000,
        tvl: '$67.8M',
        liquidityTerms: 'Instant',
        lockPeriod: 'None',
        description: 'Physical gold-backed digital certificates',
        detailedDescription: 'Each token represents ownership of physical gold stored in secure vaults.',
        rewards: ['Gold price appreciation', 'Storage fee sharing'],
        benefits: ['Inflation hedge', 'Physical gold backing', 'High liquidity'],
        backedBy: 'Physical gold reserves',
        features: ['Vault storage', 'Insurance coverage', 'Audit reports']
      },
      {
        id: 'precious-metals-fund',
        name: 'Precious Metals Fund',
        protocol: 'MetalVault',
        category: 'gold',
        apy: 4.1,
        risk: 'low',
        minimumInvestment: 2000,
        tvl: '$34.5M',
        liquidityTerms: '48-hour notice',
        lockPeriod: 'None',
        description: 'Diversified precious metals investment fund',
        detailedDescription: 'Invest in a diversified portfolio of gold, silver, platinum, and palladium.',
        rewards: ['Metal price appreciation', 'Rebalancing benefits'],
        benefits: ['Diversified metals exposure', 'Professional rebalancing', 'Lower risk'],
        backedBy: 'Physical precious metals',
        features: ['Multi-metal exposure', 'Professional management', 'Secure storage']
      },
      // Additional staking opportunities
      {
        id: 'ethereum-staking',
        name: 'Ethereum 2.0 Staking',
        protocol: 'Lido Finance',
        category: 'staking',
        apy: 5.8,
        risk: 'medium',
        minimumInvestment: 100,
        tvl: '$234.6M',
        liquidityTerms: 'Liquid staking tokens',
        lockPeriod: 'Flexible exit',
        description: 'Stake ETH and receive liquid staking tokens',
        detailedDescription: 'Participate in Ethereum 2.0 staking while maintaining liquidity through stETH tokens.',
        rewards: ['ETH staking rewards', 'stETH tokens'],
        benefits: ['Liquid staking', 'No minimum', 'Ethereum security']
      }
    ];
  };

  // Initialize opportunities with real blockchain data
  useEffect(() => {
    const fetchInvestmentOpportunities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load real DeFi opportunities from blockchain
        const realOpportunities = await getRealInvestmentOpportunities();
        
        if (realOpportunities.length > 0) {
          setAllOpportunities(realOpportunities);
          console.log('✅ Real DeFi opportunities loaded:', realOpportunities.length);
        } else {
          // Only use backup static data if no real opportunities found
          console.log('⚠️ No real opportunities found, using backup data');
          const backupOpportunities = getBackupOpportunities();
          setAllOpportunities(backupOpportunities);
          setError('Real-time data temporarily unavailable');
        }
      } catch (err) {
        console.error('❌ Error loading opportunities:', err);
        setError('Failed to load investment opportunities. Please check your wallet connection.');
        setAllOpportunities([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvestmentOpportunities();
  }, [selectedCategory, riskFilter, sortBy, sortOrder]); // Refetch when filters change

  // Get real user balance from blockchain
  useEffect(() => {
    const initializeUserBalance = async () => {
      if (isConnected && account) {
        try {
          // Get real wallet balances from blockchain
          const walletBalances = await blockchainService.getWalletBalances(account);
          
          // Get current token prices
          const symbols = Object.keys(walletBalances);
          const prices = await priceService.getTokenPrices(symbols);
          
          // Calculate total portfolio value
          let totalValue = 0;
          for (const [symbol, data] of Object.entries(walletBalances)) {
            const tokenData = data as any;
            const balance = parseFloat(tokenData.balance || '0');
            const price = prices[symbol] || 0;
            const usdValue = balance * price;
            
            tokenData.usdValue = usdValue;
            totalValue += usdValue;
          }
          
          setUserBalance(totalValue);
          console.log('✅ Real wallet balance calculated:', {
            totalUSD: totalValue,
            balances: walletBalances
          });
        } catch (error) {
          console.error('❌ Error fetching real balance:', error);
          setUserBalance(0);
        }
      } else {
        setUserBalance(0);
      }
    };
    
    initializeUserBalance();
  }, [isConnected, account]);

  // Filter and sort opportunities
  const getFilteredAndSortedOpportunities = () => {
    let filtered = allOpportunities.filter(opp => {
      // Category filter
      if (selectedCategory !== 'trending' && opp.category !== selectedCategory) {
        return false;
      }
      
      // Risk filter
      if (riskFilter !== 'all' && opp.risk !== riskFilter) {
        return false;
      }
      
      // Investment amount filter
      if (opp.minimumInvestment < minInvestmentFilter || opp.minimumInvestment > maxInvestmentFilter) {
        return false;
      }
      
      return true;
    });
    
    // Sort opportunities
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'apy':
          aValue = a.apy;
          bValue = b.apy;
          break;
        case 'risk':
          const riskOrder = { 'low': 1, 'medium': 2, 'high': 3, 'very-high': 4 };
          aValue = riskOrder[a.risk];
          bValue = riskOrder[b.risk];
          break;
        case 'minimum':
          aValue = a.minimumInvestment;
          bValue = b.minimumInvestment;
          break;
        case 'name':
          return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        default:
          aValue = a.apy;
          bValue = b.apy;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    return filtered;
  };
  
  const filteredOpportunities = getFilteredAndSortedOpportunities();
  
  // Learn More modal handlers
  const handleLearnMore = (opportunity: InvestmentOpportunity) => {
    setSelectedOpportunity(opportunity);
    setShowLearnMore(true);
  };
  
  const handleInvestNow = (opportunity: InvestmentOpportunity) => {
    if (userBalance < opportunity.minimumInvestment) {
      showWarning('Insufficient Balance', `Minimum investment required: $${opportunity.minimumInvestment.toLocaleString()}. Please fund your account to proceed.`);
      return;
    }
    
    // Redirect to investment flow or show investment modal
    console.log('Investing in:', opportunity.name);
    // Implementation would depend on the specific investment flow
  };
  
  // Calculate investment capacity
  const getInvestmentCapacity = (opportunity: InvestmentOpportunity) => {
    const capacity = Math.floor(userBalance / opportunity.minimumInvestment);
    const maxInvestment = Math.min(userBalance, opportunity.minimumInvestment * 10); // Limit to 10x minimum
    return { capacity, maxInvestment };
  };
  
  // Calculate portfolio stats from all opportunities
  const calculateStats = () => {
    if (!allOpportunities.length) {
      return { highestAPY: 0, safeOptions: 0, totalTVL: '0', portfolioAllocation: 0 };
    }
    
    const highestAPY = Math.max(...allOpportunities.map(opp => opp.apy || 0));
    const safeOptions = allOpportunities.filter(opp => opp.risk === 'low').length;
    const totalTVL = allOpportunities.reduce((sum, opp) => {
      const tvlNumber = parseFloat(opp.tvl?.replace(/[^0-9.]/g, '') || '0');
      return sum + tvlNumber;
    }, 0);
    const portfolioAllocation = wealthData?.portfolio?.defiAllocation || 0;
    
    return {
      highestAPY,
      safeOptions,
      totalTVL: totalTVL > 0 ? `$${(totalTVL / 1000).toFixed(1)}B` : '$0',
      portfolioAllocation,
      totalOpportunities: allOpportunities.length,
      avgAPY: allOpportunities.reduce((sum, opp) => sum + opp.apy, 0) / allOpportunities.length
    };
  };
  
  const stats = calculateStats();
  
  // Reset filters
  const resetFilters = () => {
    setRiskFilter('all');
    setSortBy('apy');
    setSortOrder('desc');
    setMinInvestmentFilter(0);
    setMaxInvestmentFilter(1000000);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'very-high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAPYColor = (apy: number) => {
    if (apy >= 50) return 'text-red-600'; // Very high yield - high risk
    if (apy >= 20) return 'text-orange-600'; // High yield
    if (apy >= 10) return 'text-green-600'; // Good yield
    return 'text-blue-600'; // Conservative yield
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'defi': return '🏦';
      case 'staking': return '🔒';
      case 'yield': return '🌾';
      case 'real-estate': return '🏢';
      case 'gold': return '🥇';
      case 'trending': return '🔥';
      default: return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {/* Learn More Modal */}
      {showLearnMore && selectedOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedOpportunity.name}</h3>
                  <p className="text-gray-600">{selectedOpportunity.protocol}</p>
                </div>
                <Button 
                  onClick={() => setShowLearnMore(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Expected APY</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-900">{selectedOpportunity.apy}%</div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Risk Level</div>
                  <div className="text-xl font-bold text-blue-900 capitalize">{selectedOpportunity.risk}</div>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">About This Investment</h4>
                  <p className="text-gray-700">{selectedOpportunity.detailedDescription}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Minimum Investment</div>
                    <div className="text-lg font-semibold text-gray-900">${selectedOpportunity.minimumInvestment}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Liquidity Terms</div>
                    <div className="text-lg font-semibold text-gray-900">{selectedOpportunity.liquidityTerms}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Lock Period</div>
                    <div className="text-lg font-semibold text-gray-900">{selectedOpportunity.lockPeriod}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Total Value Locked</div>
                    <div className="text-lg font-semibold text-gray-900">{selectedOpportunity.tvl}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Benefits</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOpportunity.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedOpportunity.features && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpportunity.features.map((feature, i) => (
                        <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {isConnected && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Your Investment Capacity</h4>
                    <div className="text-sm text-gray-600">
                      Available Balance: ${userBalance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Max Investment: ${Math.min(userBalance, selectedOpportunity.minimumInvestment * 10).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Positions Available: {Math.floor(userBalance / selectedOpportunity.minimumInvestment)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={() => handleInvestNow(selectedOpportunity)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!isConnected || userBalance < selectedOpportunity.minimumInvestment}
                >
                  {!isConnected ? 'Connect Wallet' : userBalance < selectedOpportunity.minimumInvestment ? 'Insufficient Balance' : 'Invest Now'}
                </Button>
                <Button 
                  onClick={() => setShowLearnMore(false)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header and Enhanced Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Investment Marketplace</h2>
            <p className="text-gray-600">Discover and invest in verified opportunities across multiple asset classes</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={onRefresh} className="bg-blue-600 hover:bg-blue-700 text-white">
              ↻ Refresh Data
            </Button>
          </div>
        </div>
        
        {/* Enhanced Filtering Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-xs text-gray-600 font-medium">Risk Level</label>
              <select 
                value={riskFilter} 
                onChange={(e) => setRiskFilter(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="very-high">Very High Risk</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-600 font-medium">Sort By</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="apy">APY</option>
                <option value="risk">Risk Level</option>
                <option value="minimum">Min. Investment</option>
                <option value="name">Name</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-600 font-medium">Order</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-600 font-medium">Min. Investment</label>
              <input 
                type="number" 
                value={minInvestmentFilter}
                onChange={(e) => setMinInvestmentFilter(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="$0"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-600 font-medium">Max. Investment</label>
              <input 
                type="number" 
                value={maxInvestmentFilter}
                onChange={(e) => setMaxInvestmentFilter(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="$1,000,000"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={resetFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Category Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { key: 'defi', label: 'DeFi Protocols', icon: '🏦', count: allOpportunities.filter(o => o.category === 'defi').length },
            { key: 'staking', label: 'Staking', icon: '🔒', count: allOpportunities.filter(o => o.category === 'staking').length },
            { key: 'yield', label: 'Yield Farming', icon: '🌾', count: allOpportunities.filter(o => o.category === 'yield').length },
            { key: 'real-estate', label: 'Real Estate', icon: '🏢', count: allOpportunities.filter(o => o.category === 'real-estate').length },
            { key: 'gold', label: 'Gold Certificates', icon: '🥇', count: allOpportunities.filter(o => o.category === 'gold').length },
            { key: 'trending', label: 'Trending', icon: '🔥', count: allOpportunities.filter(o => o.category === 'trending').length }
          ].map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all border-2 ${
                selectedCategory === category.key
                  ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mb-1">{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
              <span className="text-xs text-gray-500">{category.count} available</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 font-medium">Highest APY</div>
            <div className="text-xl sm:text-2xl font-bold text-green-900">
              {stats.highestAPY > 0 ? `${stats.highestAPY.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-green-600">Best opportunity</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 font-medium">Safe Options</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-900">{stats.safeOptions}</div>
            <div className="text-xs text-blue-600">Low risk available</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="text-sm text-purple-600 font-medium">Avg APY</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-900">
              {stats.avgAPY > 0 ? `${stats.avgAPY.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-purple-600">Across all categories</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="text-sm text-amber-600 font-medium">Total Opportunities</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-900">{stats.totalOpportunities}</div>
            <div className="text-xs text-amber-600">Across all categories</div>
          </CardContent>
        </Card>
        
        {isConnected && (
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="text-sm text-emerald-600 font-medium">Your Balance</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-900">${userBalance.toLocaleString()}</div>
              <div className="text-xs text-emerald-600">Available to invest</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Investment Opportunities Display */}
      <div className="space-y-4">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredOpportunities.length} of {allOpportunities.length} opportunities in {selectedCategory === 'trending' ? 'all categories' : selectedCategory}
          </div>
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-xl text-gray-500 mb-2">Loading investment opportunities...</p>
              <p className="text-sm text-gray-400">Fetching real-time data from multiple sources</p>
            </div>
          </div>
        ) : filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOpportunities.map((opportunity) => {
              const { capacity, maxInvestment } = getInvestmentCapacity(opportunity);
              const canInvest = isConnected && userBalance >= opportunity.minimumInvestment;
              
              return (
                <Card key={opportunity.id} className="border-2 hover:border-blue-200 transition-all hover:shadow-lg group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getCategoryIcon(opportunity.category)}</span>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {opportunity.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">{opportunity.protocol}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border mt-2 ${getRiskColor(opportunity.risk)}`}>
                          {opportunity.risk.replace('-', ' ')} Risk
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getAPYColor(opportunity.apy)}`}>
                          {opportunity.apy}%
                        </div>
                        <div className="text-sm text-gray-500">APY</div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-600 font-medium">TVL</div>
                        <div className="font-semibold text-gray-900">{opportunity.tvl}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 font-medium">Min. Investment</div>
                        <div className="font-semibold text-gray-900">${opportunity.minimumInvestment.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 font-medium">Lock Period</div>
                        <div className="font-semibold text-gray-900">{opportunity.lockPeriod}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 font-medium">Liquidity</div>
                        <div className="font-semibold text-gray-900 text-xs">{opportunity.liquidityTerms}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">{opportunity.description}</p>

                    {/* Rewards */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-600 font-medium mb-2">Rewards</div>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.rewards.slice(0, 3).map((reward, i) => (
                          <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {reward}
                          </span>
                        ))}
                        {opportunity.rewards.length > 3 && (
                          <span className="text-xs text-gray-500">+{opportunity.rewards.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    {/* Investment Capacity (if connected) */}
                    {isConnected && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="text-xs text-gray-600 font-medium mb-1">Your Investment Capacity</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Available:</span>
                            <span className="font-semibold text-gray-900"> ${userBalance.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Max Positions:</span>
                            <span className="font-semibold text-gray-900"> {capacity}</span>
                          </div>
                        </div>
                        {!canInvest && (
                          <div className="text-xs text-red-600 mt-1">
                            Insufficient balance (Min: ${opportunity.minimumInvestment.toLocaleString()})
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special Features */}
                    {opportunity.features && opportunity.features.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-gray-600 font-medium mb-2">Key Features</div>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.features.slice(0, 2).map((feature, i) => (
                            <span key={i} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handleInvestNow(opportunity)}
                        className={`flex-1 text-white ${
                          canInvest 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canInvest}
                      >
                        {!isConnected ? 'Connect Wallet' : 'Invest Now'}
                      </Button>
                      <Button 
                        onClick={() => handleLearnMore(opportunity)}
                        className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-500 mb-2">No opportunities match your criteria</p>
              <p className="text-sm text-gray-400 mb-4">Try adjusting your filters or explore different categories</p>
              <div className="space-x-3">
                <Button onClick={resetFilters} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Reset Filters
                </Button>
                <Button onClick={onRefresh} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

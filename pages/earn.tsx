import Head from 'next/head';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import EulerVaultCard from '../components/EulerVaultCard';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface YieldOpportunity {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  apy: string;
  tvl: string;
  type: 'lending' | 'staking' | 'liquidity' | 'savings';
  risk: 'low' | 'medium' | 'high';
  link: string;
  description: string;
  featured?: boolean;
}

const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
  {
    id: 'euler-axusd',
    name: 'AXUSD Lending',
    protocol: 'Euler Finance',
    asset: 'AXUSD',
    apy: 'Variable',
    tvl: '$56.49',
    type: 'lending',
    risk: 'low',
    link: 'https://app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone',
    description: 'Lend AXUSD to earn yield from borrowers. Backed by USDC, USDT, WETH, and ARB collateral.',
    featured: true
  },
  {
    id: 'axm-staking',
    name: 'AXM Staking',
    protocol: 'Axiom Protocol',
    asset: 'AXM',
    apy: '8-15%',
    tvl: '$0',
    type: 'staking',
    risk: 'low',
    link: '/staking',
    description: 'Stake AXM tokens to earn protocol rewards and governance power.'
  },
  {
    id: 'seed-locking',
    name: 'SEED Wealth Engine',
    protocol: 'Axiom Protocol',
    asset: 'AXM',
    apy: '10-20%',
    tvl: '$0',
    type: 'staking',
    risk: 'medium',
    link: '/seed',
    description: 'Lock AXM in SEED for voting power and enhanced yield from protocol revenue.'
  },
  {
    id: 'susu-savings',
    name: 'SUSU Savings Circles',
    protocol: 'Axiom Protocol',
    asset: 'AXUSD',
    apy: '5-8%',
    tvl: '$0',
    type: 'savings',
    risk: 'low',
    link: '/susu',
    description: 'Join community savings circles with rotating payouts and bonus rewards.'
  },
  {
    id: 'lending-fund',
    name: 'Real Estate Lending',
    protocol: 'Axiom Protocol',
    asset: 'AXUSD',
    apy: '8-12%',
    tvl: '$0',
    type: 'lending',
    risk: 'medium',
    link: '/lending-fund/invest',
    description: 'Invest in real estate bridge loans and DSCR rental loans backed by property collateral.'
  }
];

export default function EarnPage() {
  const { walletState } = useWallet();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [eulerStats, setEulerStats] = useState<any>(null);

  useEffect(() => {
    fetchEulerStats();
  }, []);

  const fetchEulerStats = async () => {
    try {
      const res = await fetch('/api/euler/vault-stats');
      const data = await res.json();
      if (data.success) {
        setEulerStats(data.vault);
      }
    } catch (err) {
      console.error('Error fetching Euler stats:', err);
    }
  };

  const filteredOpportunities = selectedType === 'all' 
    ? YIELD_OPPORTUNITIES 
    : YIELD_OPPORTUNITIES.filter(o => o.type === selectedType);

  const types = [
    { id: 'all', label: 'All', icon: '🎯' },
    { id: 'lending', label: 'Lending', icon: '💰' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'savings', label: 'Savings', icon: '🏦' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧' }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lending': return '💰';
      case 'staking': return '🔒';
      case 'savings': return '🏦';
      case 'liquidity': return '💧';
      default: return '📊';
    }
  };

  return (
    <Layout>
      <Head>
        <title>Earn Yield | Axiom Protocol</title>
        <meta name="description" content="Earn yield on your AXUSD and AXM tokens through lending, staking, and savings programs." />
      </Head>

      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-4">
              Earn Yield
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Put your AXUSD and AXM to work. Choose from lending markets, staking pools, 
              and savings programs to earn competitive yields.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">⭐</span> Featured: AXUSD Lending on Euler
            </h2>
            <EulerVaultCard variant="full" showCollateral={true} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedType === type.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities.filter(o => !o.featured).map((opportunity) => (
              <div 
                key={opportunity.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-yellow-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(opportunity.type)}</span>
                    <div>
                      <h3 className="text-white font-semibold">{opportunity.name}</h3>
                      <p className="text-gray-500 text-sm">{opportunity.protocol}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(opportunity.risk)}`}>
                    {opportunity.risk}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4">{opportunity.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-500 text-xs">APY</p>
                    <p className="text-green-400 font-bold">{opportunity.apy}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Asset</p>
                    <p className="text-white font-medium">{opportunity.asset}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">TVL</p>
                    <p className="text-white font-medium">{opportunity.tvl}</p>
                  </div>
                </div>

                <a
                  href={opportunity.link}
                  target={opportunity.link.startsWith('http') ? '_blank' : undefined}
                  rel={opportunity.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="block w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-center rounded-lg font-medium transition-colors"
                >
                  {opportunity.link.startsWith('http') ? 'Open App' : 'View Details'}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-6 border border-yellow-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-white text-xl font-bold mb-2">New to DeFi Yield?</h3>
                <p className="text-gray-400">
                  Learn how to earn yield safely with our beginner guides and risk management tips.
                </p>
              </div>
              <a 
                href="/learn"
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-semibold transition-colors whitespace-nowrap"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>APY rates are variable and subject to change based on market conditions.</p>
            <p className="mt-1">Always do your own research before investing.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

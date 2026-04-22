import Head from 'next/head';
import { useState } from 'react';
import EulerVaultCard from '../components/EulerVaultCard';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface YieldOpportunity {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  rate: string;
  tvl: string;
  type: 'lending' | 'lockup' | 'liquidity' | 'savings';
  risk: 'low' | 'medium' | 'high';
  link: string;
  description: string;
  featured?: boolean;
  /** "bootstrap" = pre-live; undefined = normal */
  status?: 'bootstrap';
}

const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
  {
    id: 'earn-axusd-vault',
    name: 'Axiom Earn AXUSD',
    protocol: 'Euler Earn',
    asset: 'AXUSD',
    rate: 'Inactive',
    tvl: '$0',
    type: 'lending',
    risk: 'low',
    link: '/earn/axusd',
    description: 'ERC-4626 yield vault on Arbitrum One. Bootstrap / Pre-Live — not yet operating as a live yield product. Visible for wallet connection, balance tracking, and controlled testing.',
    status: 'bootstrap',
  },
  {
    id: 'euler-axusd',
    name: 'AXUSD Lending',
    protocol: 'Euler Finance',
    asset: 'AXUSD',
    rate: 'Variable',
    tvl: '$56.49',
    type: 'lending',
    risk: 'low',
    link: 'https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059?network=arbitrumone',
    description: 'Lend AXUSD to earn yield from borrowers. Backed by USDC, USDT, WETH, and ARB collateral.',
    featured: true
  },
  {
    id: 'axm-staking',
    name: 'AXM Participation Lockup',
    protocol: 'Axiom Protocol',
    asset: 'AXM',
    rate: 'Variable',
    tvl: '$0',
    type: 'lockup',
    risk: 'low',
    link: '/staking',
    description: 'Lock AXM tokens to earn protocol rewards and governance participation rights.'
  },
  {
    id: 'seed-locking',
    name: 'SEED Wealth Engine',
    protocol: 'Axiom Protocol',
    asset: 'AXM',
    rate: 'Variable',
    tvl: '$0',
    type: 'lockup',
    risk: 'medium',
    link: '/seed',
    description: 'Lock AXM in SEED for voting power and enhanced returns from protocol revenue.'
  },
  {
    id: 'susu-savings',
    name: 'The Wealth Practice',
    protocol: 'Axiom Protocol',
    asset: 'AXUSD',
    rate: 'Variable',
    tvl: '$0',
    type: 'savings',
    risk: 'low',
    link: '/wealth-practice',
    description: 'Participate in structured group savings with transparent scheduling and audit trails.'
  },
  {
    id: 'lending-fund',
    name: 'Real Estate Lending',
    protocol: 'Axiom Protocol',
    asset: 'AXUSD',
    rate: 'Variable',
    tvl: '$0',
    type: 'lending',
    risk: 'medium',
    link: '/lending-fund/invest',
    description: 'Participate in real estate bridge loans and DSCR rental loans backed by property collateral.'
  }
];

export default function EarnPage() {
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredOpportunities = selectedType === 'all' 
    ? YIELD_OPPORTUNITIES 
    : YIELD_OPPORTUNITIES.filter(o => o.type === selectedType);

  const types = [
    { id: 'all', label: 'All', icon: '🎯' },
    { id: 'lending', label: 'Lending', icon: '💰' },
    { id: 'lockup', label: 'Participation Lockup', icon: '🔒' },
    { id: 'savings', label: 'Savings', icon: '🏦' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧' }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-dl-forest bg-dl-bg-alt border-dl-border';
      case 'medium': return 'text-dl-navy bg-dl-bg-alt border-dl-border';
      case 'high': return 'text-dl-error bg-dl-bg-alt border-dl-error';
      default: return 'text-dl-gray bg-dl-bg-alt border-dl-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lending': return '💰';
      case 'lockup': return '🔒';
      case 'savings': return '🏦';
      case 'liquidity': return '💧';
      default: return '📊';
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Earn Yield | Axiom Protocol</title>
        <meta name="description" content="Earn yield on your AXUSD and AXM tokens through lending, participation lockup, and savings programs on Axiom Protocol." />
      </Head>

      <div className="mb-8">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Earn Yield</h1>
        <p className="text-dl-gray mt-1">
          Put your AXUSD and AXM to work with lending, participation lockup, and savings programs
        </p>
      </div>

      <div className="mb-8">
        <h2 className="font-dl-serif text-xl text-dl-navy mb-4 flex items-center gap-2">
          <span>⭐</span> Featured: AXUSD Lending on Euler
        </h2>
        <EulerVaultCard variant="full" showCollateral={true} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-4 py-2 text-sm font-medium border ${
              selectedType === type.id
                ? 'bg-dl-bg-alt text-dl-navy border-dl-navy'
                : 'bg-dl-bg text-dl-gray border-dl-border'
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
            className={`bg-dl-bg p-5 border ${
              opportunity.status === 'bootstrap'
                ? 'border-dl-gold'
                : 'border-dl-border'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(opportunity.type)}</span>
                <div>
                  <h3 className="text-dl-navy font-dl-serif">{opportunity.name}</h3>
                  <p className="text-dl-gray text-sm">{opportunity.protocol}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {opportunity.status === 'bootstrap' && (
                  <span className="px-2 py-0.5 text-xs font-dl-mono border border-dl-gold text-dl-gold">
                    Bootstrap
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-dl-mono border ${getRiskColor(opportunity.risk)}`}>
                  {opportunity.risk}
                </span>
              </div>
            </div>

            <p className="text-dl-gray text-sm mb-4">{opportunity.description}</p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dl-gray text-xs">Rate</p>
                <p className={`font-dl-mono font-medium ${
                  opportunity.rate === 'Inactive' ? 'text-dl-gray' : 'text-dl-forest'
                }`}>
                  {opportunity.rate}
                </p>
              </div>
              <div>
                <p className="text-dl-gray text-xs">Asset</p>
                <p className="text-dl-navy font-medium">{opportunity.asset}</p>
              </div>
              <div>
                <p className="text-dl-gray text-xs">TVL</p>
                <p className="text-dl-navy font-dl-mono font-medium">{opportunity.tvl}</p>
              </div>
            </div>

            <a
              href={opportunity.link}
              target={opportunity.link.startsWith('http') ? '_blank' : undefined}
              rel={opportunity.link.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="block w-full py-2 bg-dl-bg-alt text-dl-navy text-center font-medium border border-dl-border"
            >
              {opportunity.link.startsWith('http') ? 'Open App' : 'View Details'}
            </a>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-dl-bg-alt border border-dl-border p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-dl-navy font-dl-serif text-xl mb-2">New to On-Chain Finance?</h3>
            <p className="text-dl-gray">
              Learn how to earn yield safely with our beginner guides and risk management tips.
            </p>
          </div>
          <a 
            href="/how-it-works"
            className="px-6 py-3 bg-dl-navy text-white font-medium whitespace-nowrap"
          >
            Learn More
          </a>
        </div>
      </div>

      <div className="mt-8 text-center text-dl-gray text-sm">
        <p>Rates are variable and subject to change based on market conditions and protocol parameters. Past rates do not indicate future performance.</p>
        <p className="mt-1">Always do your own research before investing.</p>
      </div>
    </DesignLawLayout>
  );
}

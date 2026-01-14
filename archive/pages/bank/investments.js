import Link from 'next/link';
import Layout from '../../components/Layout';

const INVESTMENT_PRODUCTS = [
  {
    id: 'dex-trading',
    name: 'DEX Trading',
    description: 'Trade AXM and other tokens on decentralized exchanges. Self-custody with transparent on-chain execution.',
    fees: '0.3% swap fee',
    features: ['Self-custody trading', 'On-chain execution', 'No KYC required', 'Multiple token pairs', 'Limit orders', 'LP opportunities'],
    icon: '📈',
    highlight: 'Popular'
  },
  {
    id: 'liquidity-pools',
    name: 'Liquidity Pools',
    description: 'Provide liquidity to token pairs and earn swap fees. Automated market maker (AMM) rewards.',
    fees: 'Earn 0.3% of swaps',
    features: ['Swap fee earnings', 'LP token rewards', 'Proportional redemption', 'Impermanent loss risk', 'Auto-compound options', 'Multiple pools'],
    icon: '💧',
    highlight: 'Yield'
  },
  {
    id: 'staking-pools',
    name: 'Staking Pools',
    description: 'Stake AXM to earn protocol rewards and participate in governance. Variable rewards based on protocol activity.',
    fees: 'No staking fees',
    features: ['Protocol rewards', 'Governance voting', 'Flexible unstaking', 'Tiered rewards', 'Transparent on-chain', 'Risk disclosures'],
    icon: '🏆'
  },
  {
    id: 'wealth-engine',
    name: 'Wealth Engine',
    description: 'Lock AXM for 1-4 years to maximize voting power and fee share rewards. veAXM tokenomics.',
    minimumInvestment: '100 AXM',
    features: ['Boosted voting power', 'Fee share rewards', '1-4 year locks', 'veAXM tokens', 'Protocol governance', 'Curve-style mechanics'],
    icon: '💎',
    highlight: 'Max Power'
  },
  {
    id: 'real-estate-tokens',
    name: 'Fractional Real Estate',
    description: 'Own fractions of Axiom Smart City properties. Earn rental distributions proportional to your share.',
    minimumInvestment: '100 AXM',
    features: ['Fractional ownership', 'Rental distributions', 'Secondary market', 'Professional management', 'On-chain transparency', 'Diversification'],
    icon: '🏘️',
    highlight: 'Passive Income'
  },
  {
    id: 'capital-pools',
    name: 'Capital Investment Pools',
    description: 'Managed investment pools for real estate, infrastructure, and node operations. Professional management.',
    minimumInvestment: '1,000 AXM',
    features: ['Fund manager oversight', 'Lock-up periods', 'Yield distributions', 'Share-based ownership', 'On-chain governance', 'Risk disclosures'],
    icon: '🏢'
  },
  {
    id: 'depin-nodes',
    name: 'DePIN Node Staking',
    description: 'Stake AXM to participate in decentralized physical infrastructure network operations.',
    minimumInvestment: '500 AXM',
    features: ['Infrastructure rewards', 'Node operations', 'Network participation', 'Variable returns', 'Insurance fund backed', 'On-chain tracking'],
    icon: '🌐'
  },
  {
    id: 'renewable-energy',
    name: 'Green Energy Credits',
    description: 'Invest in solar panels and renewable infrastructure. Sustainability-focused DeFi.',
    minimumInvestment: '500 AXM',
    features: ['Sustainability rewards', 'Energy credits', 'Carbon offsets', 'ESG certified', 'Quarterly distributions', 'Impact reporting'],
    icon: '☀️',
    highlight: 'ESG'
  }
];

const INVESTMENT_CATEGORIES = [
  { name: 'Trading', description: 'DEX trading and swaps', icon: '📈', products: ['dex-trading'] },
  { name: 'Yield', description: 'Liquidity and staking pools', icon: '💧', products: ['liquidity-pools', 'staking-pools', 'wealth-engine'] },
  { name: 'Real Assets', description: 'Property and infrastructure', icon: '🏘️', products: ['real-estate-tokens', 'capital-pools'] },
  { name: 'DePIN', description: 'Infrastructure network participation', icon: '🌐', products: ['depin-nodes', 'renewable-energy'] }
];

export default function InvestmentPoolsPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Treasury</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Pools & Staking</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-purple-100 border border-purple-300 rounded-full px-6 py-2 mb-6">
              <span className="text-purple-700 font-semibold">💎 POOLS & STAKING</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              DeFi Investment Pools
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Participate in liquidity pools, staking, and yield opportunities. 
              All returns are variable. This is not a bank or investment advisor.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">Self</div>
                <div className="text-sm text-gray-500">Custody First</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">Variable</div>
                <div className="text-sm text-gray-500">Protocol Rewards</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-500">On-Chain Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Investment Categories</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {INVESTMENT_CATEGORIES.map((cat, i) => (
              <div key={i} className="bg-white rounded-xl px-6 py-4 border border-gray-200 text-center hover:shadow-md transition-all">
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="font-semibold text-gray-900">{cat.name}</div>
                <div className="text-xs text-gray-500">{cat.description}</div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">All Investment Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {INVESTMENT_PRODUCTS.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-purple-300 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{product.icon}</div>
                {product.highlight && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    {product.highlight}
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-grow">{product.description}</p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                {product.apy && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Expected Return</span>
                    <span className="font-bold text-green-600">{product.apy}</span>
                  </div>
                )}
                {product.minimumInvestment && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Min Investment</span>
                    <span className="font-medium text-gray-900">{product.minimumInvestment}</span>
                  </div>
                )}
                {product.minimumBalance && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Min Balance</span>
                    <span className="font-medium text-gray-900">{product.minimumBalance}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Fees</span>
                  <span className="font-medium text-gray-900">{product.fees}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                <ul className="space-y-1">
                  {product.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-purple-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors mt-auto">
                Start Investing
              </button>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-16">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Investment Risk Disclosure</h3>
              <p className="text-gray-700 text-sm">
                All investments involve risk, including the potential loss of principal. Past performance 
                does not guarantee future results. Cryptocurrency and tokenized assets may be subject to 
                high volatility. Please read all disclosures and consult with a financial advisor before investing.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Start Building Your Portfolio</h2>
          <p className="text-purple-100 mb-8 max-w-2xl mx-auto">
            Whether you're a first-time investor or managing significant wealth, 
            we have the tools and products to help you reach your financial goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Open Brokerage Account
            </button>
            <Link href="/bank" className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              Explore All Products
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

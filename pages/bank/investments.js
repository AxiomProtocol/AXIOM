import Link from 'next/link';
import Layout from '../../components/Layout';

const INVESTMENT_PRODUCTS = [
  {
    id: 'brokerage',
    name: 'Self-Directed Brokerage',
    description: 'Trade tokenized stocks, bonds, and ETFs on-chain with zero commissions. Access extended trading hours and advanced research tools.',
    fees: '$0 commissions',
    features: ['Zero trading commissions', 'Fractional shares', 'Extended hours trading', 'Research tools & screeners', 'Real-time quotes', 'Options trading'],
    icon: '📈',
    highlight: 'Popular'
  },
  {
    id: 'robo-advisor',
    name: 'Automated Portfolio Management',
    description: 'AI-driven portfolio management tailored to your risk profile. Set it and forget it with automatic rebalancing.',
    fees: '0.25% annually',
    features: ['AI-powered allocation', 'Auto-rebalancing', 'Tax-loss harvesting', 'ESG options available', 'Retirement planning', 'Goal-based investing'],
    icon: '🤖'
  },
  {
    id: 'retirement-ira',
    name: 'Crypto IRA',
    description: 'Tax-advantaged retirement accounts that can hold AXM and other cryptocurrencies. Build your future with digital assets.',
    fees: '$50/year',
    features: ['Traditional & Roth options', 'Self-custody available', 'Tax-deferred growth', 'Estate planning tools', 'Rollover from 401(k)', 'Crypto diversification'],
    icon: '🏖️',
    highlight: 'Tax-Advantaged'
  },
  {
    id: 'mutual-funds',
    name: 'Axiom Index Funds',
    description: 'Low-cost index funds tracking the smart city economy. Diversified exposure with automatic dividend reinvestment.',
    apy: '8-12% historical',
    fees: '0.05% expense ratio',
    features: ['Diversified holdings', 'Ultra-low fees', 'Auto-invest feature', 'Dividend reinvestment', 'Monthly rebalancing', 'Transparent holdings'],
    icon: '📊'
  },
  {
    id: 'real-estate-tokens',
    name: 'Fractional Real Estate',
    description: 'Own fractions of Axiom Smart City properties. Earn monthly rental income with professional property management.',
    apy: '6-9% rental yield',
    minimumInvestment: '100 AXM',
    features: ['Fractional ownership', 'Monthly dividends', 'Liquid secondary market', 'Professional management', 'Property appreciation', 'Diversified portfolio'],
    icon: '🏘️',
    highlight: 'Passive Income'
  },
  {
    id: 'infrastructure-bonds',
    name: 'Smart City Infrastructure Bonds',
    description: 'Municipal bonds funding Axiom infrastructure projects. Fixed income with tax-advantaged returns.',
    apy: '4.5%',
    minimumInvestment: '5,000 AXM',
    features: ['Tax-free income', 'Government backed', 'Fixed income stream', 'Transferable tokens', 'Infrastructure funding', 'Community impact'],
    icon: '🌉'
  },
  {
    id: 'business-equity',
    name: 'Tokenized Business Equity',
    description: 'Invest directly in local Axiom businesses. Earn profit sharing and voting rights as a stakeholder.',
    apy: 'Variable',
    minimumInvestment: '1,000 AXM',
    features: ['Direct equity ownership', 'Voting rights', 'Profit sharing', 'Secondary market', 'Business updates', 'Due diligence reports'],
    icon: '🏪'
  },
  {
    id: 'renewable-energy',
    name: 'Green Energy Credits',
    description: 'Invest in solar panels and renewable infrastructure. Earn returns while supporting sustainability.',
    apy: '5-7%',
    minimumInvestment: '500 AXM',
    features: ['Sustainability rewards', 'Energy credits', 'Carbon offsets', 'ESG certified', 'Quarterly dividends', 'Impact reporting'],
    icon: '☀️',
    highlight: 'ESG'
  },
  {
    id: 'wealth-management',
    name: 'Private Wealth Management',
    description: 'Dedicated financial advisor for high-net-worth individuals. Customized strategies for complex financial situations.',
    fees: '0.75% annually',
    minimumBalance: '500,000 AXM',
    features: ['Personal advisor', 'Custom strategies', 'Estate planning', 'Tax optimization', 'Alternative investments', 'Concierge service'],
    icon: '💼',
    highlight: 'Premium'
  },
  {
    id: 'trust-services',
    name: 'Trust & Estate Services',
    description: 'Smart contract-based trusts for generational wealth transfer. Automated distributions with multi-signature control.',
    fees: 'Custom pricing',
    features: ['Revocable trusts', 'Living trusts', 'On-chain settlement', 'Multi-sig control', 'Beneficiary management', 'Automated distributions'],
    icon: '🏛️'
  }
];

const INVESTMENT_CATEGORIES = [
  { name: 'Trading', description: 'Buy and sell tokenized securities', icon: '📈', products: ['brokerage'] },
  { name: 'Managed', description: 'Professionally managed portfolios', icon: '🤖', products: ['robo-advisor', 'wealth-management'] },
  { name: 'Retirement', description: 'Tax-advantaged accounts', icon: '🏖️', products: ['retirement-ira'] },
  { name: 'Real Assets', description: 'Property and infrastructure', icon: '🏘️', products: ['real-estate-tokens', 'infrastructure-bonds', 'renewable-energy'] },
  { name: 'Private', description: 'Business equity and alternatives', icon: '🏪', products: ['business-equity', 'trust-services'] }
];

export default function InvestmentsPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Investments</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-purple-100 border border-purple-300 rounded-full px-6 py-2 mb-6">
              <span className="text-purple-700 font-semibold">💎 INVESTMENT PRODUCTS</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Grow Your Wealth On-Chain
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              From self-directed trading to managed portfolios, discover investment opportunities 
              that leverage blockchain technology for transparency and efficiency.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">$0</div>
                <div className="text-sm text-gray-500">Trading Fees</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">10+</div>
                <div className="text-sm text-gray-500">Investment Options</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-500">Market Access</div>
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

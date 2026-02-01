import Link from 'next/link';
import Layout from '../../components/Layout';

const REAL_ESTATE_PRODUCTS = [
  {
    id: 'keygrow-rto',
    name: 'KeyGrow Rent-to-Own',
    description: 'Build equity through rent payments with tokenized property shares. Path to homeownership through the Axiom ecosystem.',
    terms: 'Variable',
    features: ['Tokenized equity shares', 'Monthly rent builds ownership', 'Smart contract custody', 'Transparent on-chain tracking', 'Seller marketplace', 'Flexible terms'],
    icon: '🏠',
    highlight: 'Featured'
  },
  {
    id: 'fractional-property',
    name: 'Fractional Property Tokens',
    description: 'Own fractions of Axiom Smart City properties. Earn rental distributions proportional to your share.',
    minimum: '100 AXM',
    features: ['Fractional ownership', 'Rental distributions', 'Secondary market trading', 'Professional management', 'On-chain transparency', 'Diversification'],
    icon: '🏘️',
    highlight: 'Passive Income'
  },
  {
    id: 'property-collateral',
    name: 'Property-Backed Position',
    description: 'Use tokenized property shares as collateral for liquidity without selling your assets.',
    ltv: 'Variable based on asset',
    features: ['Keep property upside', 'Variable rates', 'Smart contract custody', 'Liquidation protection', 'Transparent terms', 'On-chain settlement'],
    icon: '🔑'
  },
  {
    id: 'capital-pool-re',
    name: 'Real Estate Capital Pool',
    description: 'Participate in managed real estate investment pools for larger property acquisitions.',
    minimum: '1,000 AXM',
    features: ['Professional management', 'Diversified holdings', 'Lock-up periods apply', 'Share-based ownership', 'Quarterly distributions', 'Governance rights'],
    icon: '🏢'
  }
];

const PROPERTY_STEPS = [
  { step: '1', title: 'Connect Wallet', description: 'Connect your Web3 wallet to access property investment options.', icon: '🔗' },
  { step: '2', title: 'Browse Properties', description: 'Explore available tokenized properties and investment pools.', icon: '🏘️' },
  { step: '3', title: 'Invest', description: 'Purchase property tokens or join investment pools directly on-chain.', icon: '💎' },
  { step: '4', title: 'Earn', description: 'Receive rental distributions and track your portfolio on-chain.', icon: '📈' }
];

export default function PropertyInvestmentsPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Treasury</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Property & Real Estate</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-green-100 border border-green-300 rounded-full px-6 py-2 mb-6">
              <span className="text-green-700 font-semibold">🏡 PROPERTY & REAL ESTATE</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tokenized Property Investments
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Participate in real estate through tokenized property shares and investment pools. 
              All transactions on-chain with transparent ownership tracking. Not a mortgage lender.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">Tokenized</div>
                <div className="text-sm text-gray-500">Ownership</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">Fractional</div>
                <div className="text-sm text-gray-500">Investment</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">On-Chain</div>
                <div className="text-sm text-gray-500">Transparency</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {PROPERTY_STEPS.map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  {step.icon}
                </div>
                <div className="absolute top-8 left-1/2 w-full h-0.5 bg-green-200 -z-10 hidden md:block" style={{ display: i === 3 ? 'none' : 'block' }}></div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Property Investment Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-16">
          {REAL_ESTATE_PRODUCTS.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{product.icon}</div>
                {product.highlight && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    {product.highlight}
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-4 flex-grow">{product.description}</p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                {product.terms && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Terms</span>
                    <span className="font-medium text-gray-900">{product.terms}</span>
                  </div>
                )}
                {product.minimum && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Minimum</span>
                    <span className="font-medium text-gray-900">{product.minimum}</span>
                  </div>
                )}
                {product.ltv && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">LTV</span>
                    <span className="font-medium text-gray-900">{product.ltv}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                <ul className="space-y-1">
                  {product.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors mt-auto">
                Learn More
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Axiom Property Tokens?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Fast Closing</h3>
              <p className="text-gray-600 text-sm">Close in as little as 7 days with our streamlined on-chain process</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-bold text-gray-900 mb-2">Secure Title</h3>
              <p className="text-gray-600 text-sm">Your property title is tokenized and secured on the blockchain forever</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-gray-900 mb-2">Lower Costs</h3>
              <p className="text-gray-600 text-sm">Save on closing costs with automated smart contract settlements</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Own Property in Axiom?</h2>
          <p className="text-green-100 mb-8 max-w-2xl mx-auto">
            Start your journey to homeownership in America's first on-chain smart city. 
            Get pre-qualified today with no impact to your credit score.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-green-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Get Pre-Qualified
            </button>
            <Link href="/bank/rates" className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              View Current Rates
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

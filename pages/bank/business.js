import Link from 'next/link';
import Layout from '../../components/Layout';

const BUSINESS_PRODUCTS = [
  {
    id: 'business-checking',
    name: 'Business Checking Account',
    description: 'Feature-rich business checking with unlimited transactions, multi-user access, and seamless payroll integration.',
    fees: '$15/month (waived with $10K balance)',
    features: ['Unlimited transactions', 'Multi-user access & permissions', 'Payroll integration', 'Cash management tools', 'Accounts payable/receivable', 'Real-time reporting'],
    icon: '🏦',
    highlight: 'Essential'
  },
  {
    id: 'business-savings',
    name: 'Business Savings Account',
    description: 'Grow your business reserves with competitive interest rates. Perfect for emergency funds and future investments.',
    apy: '4.5%',
    fees: 'No fees',
    features: ['Competitive APY', 'Unlimited deposits', 'Easy fund transfers', 'Tiered interest rates', 'Auto-sweep from checking', 'No minimum balance'],
    icon: '💰',
    highlight: 'High Yield'
  },
  {
    id: 'merchant-services',
    name: 'Merchant Payment Processing',
    description: 'Accept AXM and fiat payments at your business with low fees and instant settlement.',
    fees: '1.5% + $0.10 per transaction',
    features: ['POS system integration', 'Online checkout widgets', 'Instant settlement', 'Fraud protection', 'Chargeback management', 'Multi-currency support'],
    icon: '🛒'
  },
  {
    id: 'business-loan',
    name: 'Small Business Loan',
    description: 'Flexible funding for Axiom-based businesses with revenue-based repayment options.',
    apr: '6.5% APR',
    amount: 'Up to 500,000 AXM',
    features: ['Revenue-based repayment', 'Quick approval (24-48 hrs)', 'No collateral under 25K', 'Flexible terms 1-7 years', 'Working capital & expansion', 'Equipment financing'],
    icon: '🏢'
  },
  {
    id: 'merchant-cash-advance',
    name: 'Merchant Cash Advance',
    description: 'Fast working capital based on your future revenue. Perfect for seasonal businesses or urgent needs.',
    fees: 'Factor rate 1.2-1.4',
    features: ['Funding in 24 hours', 'No collateral required', 'Revenue-based repayment', 'No fixed monthly payments', 'Use for any purpose', 'Simple application'],
    icon: '💵',
    highlight: 'Fast Funding'
  },
  {
    id: 'treasury-management',
    name: 'Treasury Management',
    description: 'Enterprise-grade cash management and liquidity solutions for larger businesses.',
    minimumBalance: '100,000 AXM',
    fees: 'Custom pricing',
    features: ['Cash pooling & concentration', 'Liquidity management', 'Yield optimization', 'Multi-currency accounts', 'API integration', 'Dedicated account manager'],
    icon: '💎',
    highlight: 'Enterprise'
  }
];

const BUSINESS_BENEFITS = [
  { icon: '⚡', title: 'Instant Settlements', description: 'Receive payments instantly on-chain, no waiting for bank processing' },
  { icon: '🌍', title: 'Global Reach', description: 'Accept payments from anywhere in the world with low forex fees' },
  { icon: '📊', title: 'Real-Time Analytics', description: 'Track your business performance with live dashboards and reports' },
  { icon: '🔐', title: 'Enterprise Security', description: 'Multi-signature wallets and role-based access controls' },
  { icon: '🤖', title: 'API Integration', description: 'Connect your existing systems with our robust banking APIs' },
  { icon: '📱', title: 'Mobile Management', description: 'Manage your business finances from anywhere' }
];

export default function BusinessBankingPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Business Banking</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-indigo-100 border border-indigo-300 rounded-full px-6 py-2 mb-6">
              <span className="text-indigo-700 font-semibold">🏢 BUSINESS BANKING</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Business Banking Solutions
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Powerful financial tools built for modern businesses. From startups to enterprises, 
              we provide the banking infrastructure to scale your operations on-chain.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-indigo-600">500K+</div>
                <div className="text-sm text-gray-500">Max Business Loan</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">1.5%</div>
                <div className="text-sm text-gray-500">Payment Processing</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">Instant</div>
                <div className="text-sm text-gray-500">Settlements</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Business Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {BUSINESS_PRODUCTS.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{product.icon}</div>
                {product.highlight && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                    {product.highlight}
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-4 flex-grow">{product.description}</p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                {product.apy && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">APY</span>
                    <span className="font-bold text-green-600">{product.apy}</span>
                  </div>
                )}
                {product.apr && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">APR</span>
                    <span className="font-bold text-amber-600">{product.apr}</span>
                  </div>
                )}
                {product.amount && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Amount</span>
                    <span className="font-bold text-gray-900">{product.amount}</span>
                  </div>
                )}
                {product.minimumBalance && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Minimum</span>
                    <span className="font-bold text-gray-900">{product.minimumBalance}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Fees</span>
                  <span className="font-medium text-gray-900">{product.fees}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Features</h4>
                <ul className="space-y-1">
                  {product.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors mt-auto">
                Get Started
              </button>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Businesses Choose Axiom</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BUSINESS_BENEFITS.map((benefit, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Business?</h2>
          <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join forward-thinking businesses already using Axiom for their banking needs. 
            Our team is ready to help you get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Open Business Account
            </button>
            <Link href="/contact" className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              Talk to Sales
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

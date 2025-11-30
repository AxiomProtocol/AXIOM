import Link from 'next/link';
import Layout from '../../components/Layout';

const MORTGAGE_PRODUCTS = [
  {
    id: 'home-mortgage',
    name: 'Smart City Home Mortgage',
    description: 'Tokenized mortgages for Axiom Smart City properties with on-chain title registration and automated escrow.',
    apr: '4.5%',
    terms: 'Up to 30 years',
    downPayment: '10-20%',
    features: ['Tokenized title on-chain', 'Automated escrow', 'Smart contract settlement', 'Low closing costs', 'Fixed & adjustable rates', 'No hidden fees'],
    icon: '🏠',
    highlight: 'Featured'
  },
  {
    id: 'heloc',
    name: 'Home Equity Line of Credit',
    description: 'Access the equity in your tokenized property with a flexible revolving credit line. Draw funds as needed.',
    apr: '6.0%',
    ltv: 'Up to 85%',
    features: ['Revolving credit line', 'Draw period flexibility', 'Smart contract secured', 'Interest-only options', 'No annual fee', 'Quick access to funds'],
    icon: '🔑'
  },
  {
    id: 'refinance',
    name: 'Mortgage Refinancing',
    description: 'Lower your rate or access equity with our streamlined refinancing process. Same-day approvals available.',
    apr: 'From 4.25%',
    features: ['Rate reduction options', 'Cash-out refinancing', 'No appraisal needed', 'Streamlined process', 'Lower monthly payments', 'Consolidate debt'],
    icon: '🔄',
    highlight: 'Low Rates'
  },
  {
    id: 'investment-property',
    name: 'Investment Property Loan',
    description: 'Finance rental properties and investment real estate within the Axiom Smart City ecosystem.',
    apr: '5.5%',
    downPayment: '20-25%',
    features: ['Up to 4 properties', 'Rental income considered', 'Competitive rates', 'Portfolio loans available', 'Property management tools', 'Fractional investment'],
    icon: '🏘️'
  },
  {
    id: 'construction-loan',
    name: 'Construction Loan',
    description: 'Build your dream home in Axiom Smart City with financing that covers land purchase through construction.',
    apr: '5.75%',
    features: ['Land + construction funding', 'Draw schedule payments', 'Converts to mortgage', 'Builder payment management', 'Progress inspections', 'Interest-only during build'],
    icon: '🏗️'
  },
  {
    id: 'auto-loan',
    name: 'Vehicle Financing',
    description: 'Competitive rates on new and used vehicle loans with flexible terms up to 7 years.',
    apr: '5.5%',
    amount: 'Up to 100,000 AXM',
    features: ['New & used vehicles', 'Up to 7 year terms', 'Pre-approval available', 'Refinance options', 'No prepayment penalty', 'Gap insurance available'],
    icon: '🚗'
  },
  {
    id: 'student-loan',
    name: 'Education Loan',
    description: 'Invest in your future with flexible education financing for Axiom Academy and accredited institutions.',
    apr: '4.0%',
    features: ['Deferred repayment option', 'Income-based plans', 'Axiom Academy credits', 'No cosigner needed', 'Grace period after graduation', 'Refinancing available'],
    icon: '🎓',
    highlight: 'Students'
  }
];

const MORTGAGE_STEPS = [
  { step: '1', title: 'Pre-Qualification', description: 'Get pre-qualified in minutes with our online application. No impact to your credit score.', icon: '📋' },
  { step: '2', title: 'Documentation', description: 'Upload required documents securely. Our smart contracts verify automatically.', icon: '📁' },
  { step: '3', title: 'Approval', description: 'Receive approval within 24-48 hours. View your personalized rate options.', icon: '✅' },
  { step: '4', title: 'Closing', description: 'Sign digitally and close on-chain. Your tokenized title is registered instantly.', icon: '🔐' }
];

export default function MortgagePage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Mortgages & Loans</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-green-100 border border-green-300 rounded-full px-6 py-2 mb-6">
              <span className="text-green-700 font-semibold">🏡 MORTGAGES & LOANS</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Home & Property Financing
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Tokenized mortgages and loans for the Axiom Smart City. Experience the future of 
              property financing with on-chain title registration and smart contract settlements.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">4.5%</div>
                <div className="text-sm text-gray-500">Starting Rate</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">30 Years</div>
                <div className="text-sm text-gray-500">Max Term</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">On-Chain</div>
                <div className="text-sm text-gray-500">Title Registry</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {MORTGAGE_STEPS.map((step, i) => (
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

        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Loan Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {MORTGAGE_PRODUCTS.map(product => (
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
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500 text-sm">Rate</span>
                  <span className="font-bold text-green-600">{product.apr}</span>
                </div>
                {product.terms && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Terms</span>
                    <span className="font-medium text-gray-900">{product.terms}</span>
                  </div>
                )}
                {product.downPayment && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">Down Payment</span>
                    <span className="font-medium text-gray-900">{product.downPayment}</span>
                  </div>
                )}
                {product.ltv && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 text-sm">LTV</span>
                    <span className="font-medium text-gray-900">{product.ltv}</span>
                  </div>
                )}
                {product.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Amount</span>
                    <span className="font-medium text-gray-900">{product.amount}</span>
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
                Get Pre-Qualified
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Axiom Mortgages?</h2>
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

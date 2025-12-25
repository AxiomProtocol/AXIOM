import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import StepProgressBanner from '../components/StepProgressBanner';

const BANKING_PRODUCTS = [
  { id: 'wallet-self-custody', name: 'Self-Custody Wallet', category: 'deposit', description: 'Your AXM tokens in your own wallet. You control your keys, you control your funds.', status: 'live', custodyType: 'self', features: ['Full control', 'No intermediary', 'Instant transfers', 'Connect any wallet'], icon: '🔐', riskLevel: 'low' },
  { id: 'susu-savings', name: 'Community Savings Circles (SUSU)', category: 'deposit', description: 'Rotating savings groups where members pool funds and take turns receiving payouts', apy: 'Variable', status: 'live', custodyType: 'pooled', features: ['Community-based', '2-50 members', 'Configurable cycles', 'On-chain transparency'], icon: '🤝', riskLevel: 'medium', contractAddress: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5' },
  { id: 'capital-pools', name: 'Capital Investment Pools', category: 'investments', description: 'Managed investment funds for real estate, infrastructure, and node operations', apy: 'Variable', status: 'live', custodyType: 'pooled', features: ['Fund manager oversight', 'Lock-up periods', 'Yield distribution', 'Share-based ownership'], icon: '📈', riskLevel: 'high', contractAddress: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701' },
  { id: 'dex-liquidity', name: 'DEX Liquidity Provision', category: 'investments', description: 'Provide liquidity to token pairs and earn swap fees', apy: 'Variable (0.3% fees)', status: 'live', custodyType: 'pooled', features: ['AMM pools', 'Proportional redemption', 'Swap fee earnings', 'Impermanent loss risk'], icon: '💧', riskLevel: 'high' },
  { id: 'instant-pay', name: 'Instant Pay (P2P)', category: 'payments', description: 'Send AXM instantly to any wallet address on Arbitrum One', fees: 'Network gas only', status: 'live', custodyType: 'self', features: ['Instant settlement', 'Wallet-to-wallet', 'No intermediary', 'Full control'], icon: '⚡', riskLevel: 'low' },
  { id: 'staking', name: 'AXM Staking', category: 'investments', description: 'Stake AXM tokens to earn rewards and participate in governance', apy: 'Variable', status: 'live', custodyType: 'contract', features: ['Tiered rewards', 'Governance power', 'Flexible unstaking', 'Reward claiming'], icon: '🏆', riskLevel: 'medium' },
  { id: 'keygrow-rto', name: 'KeyGrow Rent-to-Own', category: 'tokenized', description: 'Build equity through rent payments with tokenized property shares', status: 'live', custodyType: 'contract', features: ['Equity accrual', 'Property tokens', 'Seller marketplace', 'Transparent tracking'], icon: '🏠', riskLevel: 'medium' },
  { id: 'checking-standard', name: 'Standard Checking Account', category: 'deposit', description: 'Basic checking account with instant AXM transfers', apy: '0.5%', status: 'planned', custodyType: 'contract', features: ['Instant transfers', 'Mobile banking', 'Bill pay', 'Direct deposit'], icon: '💳', riskLevel: 'low' },
  { id: 'checking-premium', name: 'Premium Checking Account', category: 'deposit', description: 'High-yield checking with governance rewards', apy: '2.5%', status: 'planned', custodyType: 'contract', features: ['Higher APY', 'Governance voting', 'Priority support', 'Fee rebates'], icon: '👑', riskLevel: 'low' },
  { id: 'savings-standard', name: 'High-Yield Savings Vault', category: 'deposit', description: 'Earn yield on AXM deposits through smart contract vaults', apy: 'TBD', status: 'planned', custodyType: 'contract', features: ['Transparent yield', 'Opt-in only', 'Withdrawal anytime', 'Risk disclosure'], icon: '🏦', riskLevel: 'medium' },
  { id: 'personal-loan', name: 'Personal Loan', category: 'lending', description: 'Unsecured personal loans for community members', apy: 'TBD', status: 'planned', custodyType: 'contract', features: ['Credit assessment', 'Fixed rates', 'Community backed', 'Transparent terms'], icon: '💰', riskLevel: 'medium' },
  { id: 'crypto-backed-loan', name: 'Crypto-Backed Loan', category: 'lending', description: 'Collateralized loans using AXM or other tokens', apy: 'TBD', status: 'planned', custodyType: 'contract', features: ['Collateral vault', 'Liquidation protection', 'Keep upside', 'Flexible terms'], icon: '🔐', riskLevel: 'high' },
  { id: 'home-mortgage', name: 'Tokenized Mortgage', category: 'lending', description: 'Tokenized mortgages for Axiom community properties', apy: 'TBD', status: 'planned', custodyType: 'contract', features: ['Tokenized title', 'Community verification', 'On-chain settlement', 'Equity tracking'], icon: '🏠', riskLevel: 'medium' },
  { id: 'real-estate-tokens', name: 'Fractional Real Estate', category: 'tokenized', description: 'Own fractions of Axiom community properties via tokens', apy: 'TBD', status: 'planned', custodyType: 'pooled', features: ['Fractional ownership', 'Rental income', 'Secondary market', 'Transparent management'], icon: '🏘️', riskLevel: 'medium' },
  { id: 'renewable-energy', name: 'Green Energy Credits', category: 'tokenized', description: 'Invest in solar panels and renewable infrastructure', apy: 'TBD', status: 'planned', custodyType: 'pooled', features: ['Sustainability rewards', 'Carbon offsets', 'ESG certified', 'Impact tracking'], icon: '☀️', riskLevel: 'medium' },
  { id: 'onramp', name: 'Fiat-to-Crypto Onramp', category: 'payments', description: 'Purchase AXM and other tokens using fiat currency', status: 'live', custodyType: 'self', features: ['Multiple providers', 'Card payments', 'Bank transfers', 'Direct to wallet'], icon: '💵', riskLevel: 'low' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🏛️', color: 'gray' },
  { id: 'deposit', name: 'Deposit & Savings', icon: '🏦', color: 'blue' },
  { id: 'lending', name: 'Credit & Lending', icon: '💰', color: 'green' },
  { id: 'payments', name: 'Payment Services', icon: '💸', color: 'purple' },
  { id: 'investments', name: 'Investment Products', icon: '📈', color: 'amber' },
  { id: 'tokenized', name: 'Tokenized Assets', icon: '🏘️', color: 'pink' },
];

const CORE_VALUES = [
  { icon: '🔐', title: 'Self-Custody First', description: 'Your keys, your funds. All products default to self-custody unless you explicitly opt in to pooled services.' },
  { icon: '🌟', title: 'Transparency', description: 'All transactions recorded on Arbitrum One blockchain with full audit trails' },
  { icon: '🤝', title: 'Community-Governed', description: 'AXM token holders vote on protocol decisions and fund allocations' },
  { icon: '⚠️', title: 'Clear Disclosures', description: 'Every product clearly states its custody model, risks, and how funds are used' },
];

const CUSTODY_TYPES = {
  self: { label: 'Self-Custody', color: 'green', description: 'You hold tokens in your own wallet. Protocol cannot access your funds.' },
  contract: { label: 'Smart Contract', color: 'blue', description: 'Funds held by audited smart contracts with defined rules. You initiate all deposits and withdrawals.' },
  pooled: { label: 'Pooled Custody', color: 'amber', description: 'Funds pooled with other users. Managers or automated rules control distributions. Higher risk.' },
};

export default function BankPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustodyInfo, setShowCustodyInfo] = useState(false);

  const filteredProducts = BANKING_PRODUCTS.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const liveProducts = BANKING_PRODUCTS.filter(p => p.status === 'live').length;
  const plannedProducts = BANKING_PRODUCTS.filter(p => p.status === 'planned').length;

  const getCategoryCount = (categoryId) => {
    if (categoryId === 'all') return BANKING_PRODUCTS.length;
    return BANKING_PRODUCTS.filter(p => p.category === categoryId).length;
  };

  const getRiskBadgeColor = (risk) => {
    switch(risk) {
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'live') {
      return <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">LIVE</span>;
    }
    return <span className="px-2 py-1 bg-gray-400 text-white text-xs font-bold rounded-full">PLANNED</span>;
  };

  const getCustodyBadge = (custodyType) => {
    const custody = CUSTODY_TYPES[custodyType];
    if (!custody) return null;
    const colorClasses = {
      green: 'bg-green-100 text-green-700 border-green-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClasses[custody.color]}`}>
        {custody.label}
      </span>
    );
  };

  return (
    <Layout>
      <StepProgressBanner isAdvanced={true} />
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block bg-amber-100 border border-amber-300 rounded-full px-6 py-2 mb-6">
            <span className="text-amber-700 font-semibold">AXIOM FINANCIAL SERVICES</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              Financial Coordination
            </span>
            <span className="text-gray-900"> Hub</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Community financial tools powered by smart contracts on Arbitrum One. 
            Self-custody by default. Transparent on-chain operations.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-green-500">{liveProducts}</div>
              <div className="text-gray-600 text-sm mt-1">Live Products</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-gray-400">{plannedProducts}</div>
              <div className="text-gray-600 text-sm mt-1">In Development</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-blue-500">24/7</div>
              <div className="text-gray-600 text-sm mt-1">Blockchain Access</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-purple-500">100%</div>
              <div className="text-gray-600 text-sm mt-1">On-Chain</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-blue-800 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔐</span>
              <div>
                <h2 className="text-xl font-bold text-white">Self-Custody by Default</h2>
                <p className="text-blue-200 text-sm">Your tokens stay in your wallet unless you explicitly opt in to pooled services</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCustodyInfo(!showCustodyInfo)}
              className="px-4 py-2 bg-white text-blue-900 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              {showCustodyInfo ? 'Hide' : 'Learn More'} About Custody
            </button>
          </div>
          
          {showCustodyInfo && (
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {Object.entries(CUSTODY_TYPES).map(([key, custody]) => (
                <div key={key} className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                    custody.color === 'green' ? 'bg-green-500 text-white' :
                    custody.color === 'blue' ? 'bg-blue-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {custody.label}
                  </div>
                  <p className="text-blue-100 text-sm">{custody.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Principles</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {CORE_VALUES.map((value, i) => (
              <div key={i} className="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Financial Products</h2>
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                {cat.icon} {cat.name} ({getCategoryCount(cat.id)})
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className={`bg-white rounded-xl p-6 border ${product.status === 'live' ? 'border-green-200' : 'border-gray-200'} hover:shadow-lg transition-all`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl">{product.icon}</div>
                  <div className="flex flex-col gap-1 items-end">
                    {getStatusBadge(product.status)}
                    {getCustodyBadge(product.custodyType)}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                
                <div className="space-y-2 mb-4">
                  {product.apy && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Yield</span>
                      <span className="font-semibold text-green-600">{product.apy}</span>
                    </div>
                  )}
                  {product.fees && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fees</span>
                      <span className="font-medium text-gray-900">{product.fees}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Risk Level</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(product.riskLevel)}`}>
                      {product.riskLevel}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {product.features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                  {product.features.length > 3 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                      +{product.features.length - 3} more
                    </span>
                  )}
                </div>

                {product.contractAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a 
                      href={`https://arbitrum.blockscout.com/address/${product.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Contract
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Important Disclosures</h2>
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-amber-800 mb-4">Custody and Control</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">●</span>
                    <span><strong>Self-Custody Products:</strong> You maintain full control of your tokens in your own wallet. The protocol cannot access or move your funds.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">●</span>
                    <span><strong>Smart Contract Products:</strong> Funds are held in audited smart contracts. You initiate all deposits and withdrawals.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-3 mt-1">●</span>
                    <span><strong>Pooled Products:</strong> Your funds are combined with other users. Distributions are controlled by managers or automated rules. Higher risk.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-amber-800 mb-4">Risk Acknowledgment</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3">⚠</span>
                    <span><strong>No FDIC Insurance:</strong> Cryptocurrency deposits are not insured by FDIC or any government agency.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3">⚠</span>
                    <span><strong>Smart Contract Risk:</strong> While contracts are audited, bugs or exploits could result in loss of funds.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3">⚠</span>
                    <span><strong>Volatility:</strong> Cryptocurrency values can fluctuate significantly. Past performance does not guarantee future results.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3">⚠</span>
                    <span><strong>Regulatory Status:</strong> These are community financial coordination tools, not traditional banking products.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Deployed Infrastructure</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">⛓️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Blockchain Network</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Network:</strong> Arbitrum One (L2)</li>
                <li><strong>Chain ID:</strong> 42161</li>
                <li><strong>Token:</strong> AXM (ERC20)</li>
                <li><strong>Explorer:</strong> Blockscout</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Contracts</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>AXM Token:</strong> Verified</li>
                <li><strong>SUSU Hub:</strong> Verified</li>
                <li><strong>Capital Pools:</strong> Verified</li>
                <li><strong>DEX Hub:</strong> Verified</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>OpenZeppelin AccessControl</li>
                <li>ReentrancyGuard on all funds</li>
                <li>Pausable for emergencies</li>
                <li>Internal security audit completed</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Start Building Wealth</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore our live products or join the waitlist for upcoming features. 
            Your keys, your funds, your future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/wealth-practice" 
              className="px-8 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Explore Wealth Practice
            </Link>
            <Link 
              href="/onramp" 
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              Get AXM Tokens
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

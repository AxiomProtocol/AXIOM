import Link from 'next/link';
import Layout from '../../components/Layout';

const LEADERSHIP_TEAM = [
  { name: 'Axiom DAO Council', role: 'Governance Body', description: 'Elected AXM token holders governing major bank decisions', icon: '🗳️' },
  { name: 'Treasury Committee', role: 'Financial Oversight', description: 'Multi-signature treasury management and reserve monitoring', icon: '🏦' },
  { name: 'Risk Committee', role: 'Risk Management', description: 'Credit, operational, and smart contract risk assessment', icon: '🛡️' },
  { name: 'Compliance Team', role: 'Regulatory Affairs', description: 'KYC/AML compliance and regulatory liaison', icon: '⚖️' },
];

const MILESTONES = [
  { year: '2024', event: 'Axiom Banking concept development and smart contract architecture', status: 'completed' },
  { year: 'Q1 2025', event: 'Core banking contracts deployed on Arbitrum One', status: 'completed' },
  { year: 'Q2 2025', event: 'Deposit accounts and payment services launch', status: 'current' },
  { year: 'Q3 2025', event: 'Lending products and credit scoring system', status: 'upcoming' },
  { year: 'Q4 2025', event: 'Investment products and tokenized assets marketplace', status: 'upcoming' },
  { year: '2026', event: 'Full banking license and FDIC-equivalent insurance', status: 'upcoming' },
];

const REGULATORY_INFO = [
  { title: 'Legal Entity', value: 'Axiom City DAO LLC', description: 'Delaware-registered limited liability company' },
  { title: 'Governance', value: 'DAO Controlled', description: 'AXM token holders vote on major decisions' },
  { title: 'Primary Network', value: 'Arbitrum One', description: 'Ethereum L2 with Chain ID 42161' },
  { title: 'Audit Status', value: 'Ongoing', description: 'Regular third-party smart contract audits' },
];

const CORE_VALUES = [
  { icon: '🌟', title: 'Transparency', description: 'Every transaction, every decision recorded on-chain. Full visibility into reserves, lending, and treasury operations.' },
  { icon: '🤝', title: 'Community Ownership', description: 'Not a bank run by executives - governed by AXM token holders who vote on rates, products, and policies.' },
  { icon: '🔒', title: 'Security First', description: 'Multi-signature wallets, audited smart contracts, and enterprise-grade infrastructure protecting every deposit.' },
  { icon: '🚀', title: 'Innovation', description: 'Pioneering the future of banking with tokenized assets, instant settlements, and programmable money.' },
];

export default function AboutBankPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">About the Bank</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-orange-100 border border-orange-300 rounded-full px-6 py-2 mb-6">
              <span className="text-orange-700 font-semibold">🏛️ ABOUT THE BANK</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              About National Bank of Axiom
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              America's first fully on-chain sovereign banking system. Regulated, transparent, 
              and powered by blockchain technology to serve the Axiom Smart City economy.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              To establish the first sovereign digital-physical economy in America 
              through blockchain-powered banking infrastructure. We provide transparent, 
              accessible financial services that empower individuals, businesses, and 
              communities to participate in the future of finance.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8">
            <div className="text-5xl mb-4">🔭</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-700 leading-relaxed">
              To become the leading model for smart city banking worldwide, 
              demonstrating how blockchain technology can create sovereign, 
              community-governed financial systems that rival and surpass 
              traditional Wall Street institutions.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_VALUES.map((value, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:shadow-lg transition-all">
                <div className="text-5xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Bank Overview</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {REGULATORY_INFO.map((info, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">{info.title}</div>
                <div className="text-xl font-bold text-amber-600 mb-1">{info.value}</div>
                <div className="text-xs text-gray-500">{info.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Governance Structure</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {LEADERSHIP_TEAM.map((member, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-4xl mb-4">{member.icon}</div>
                <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                <div className="text-amber-600 text-sm font-medium mb-2">{member.role}</div>
                <p className="text-gray-600 text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-amber-200 hidden md:block"></div>
            <div className="space-y-6">
              {MILESTONES.map((milestone, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    milestone.status === 'completed' ? 'bg-green-100 border-2 border-green-400' :
                    milestone.status === 'current' ? 'bg-amber-100 border-2 border-amber-400' :
                    'bg-gray-100 border-2 border-gray-300'
                  }`}>
                    <span className={`text-xs font-bold ${
                      milestone.status === 'completed' ? 'text-green-700' :
                      milestone.status === 'current' ? 'text-amber-700' :
                      'text-gray-500'
                    }`}>{milestone.year}</span>
                  </div>
                  <div className={`bg-white border rounded-xl p-4 flex-1 ${
                    milestone.status === 'current' ? 'border-amber-300 shadow-md' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-700">{milestone.event}</p>
                      {milestone.status === 'completed' && (
                        <span className="text-green-500">✓</span>
                      )}
                      {milestone.status === 'current' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">In Progress</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Technology Infrastructure</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">⛓️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Blockchain Layer</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Current:</strong> Arbitrum One (L2)</li>
                <li><strong>Chain ID:</strong> 42161</li>
                <li><strong>Future:</strong> Universe Blockchain (L3)</li>
                <li><strong>Gas Token:</strong> AXM</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Multi-signature wallets</li>
                <li>Time-locked transactions</li>
                <li>Circuit breaker mechanisms</li>
                <li>Emergency pause functionality</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Contracts</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Treasury & Revenue Hub</li>
                <li>Identity & Compliance</li>
                <li>Asset Registry</li>
                <li>Staking & Governance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Banking Revolution</h2>
          <p className="text-amber-100 mb-8 max-w-2xl mx-auto">
            Be part of history as we build America's first on-chain sovereign banking system. 
            Your deposits, your governance, your bank.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/bank" className="px-8 py-3 bg-white text-amber-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Explore Products
            </Link>
            <Link href="/launchpad" className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              Join TGE Waitlist
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

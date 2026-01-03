import Layout from "../components/Layout";

const VALUES = [
  {
    icon: "🔓",
    title: "Transparency",
    description: "Every transaction, every decision, every dollar is recorded on-chain. Our proof-of-reserves and real-time reporting ensure complete visibility into operations."
  },
  {
    icon: "🤝",
    title: "Community Ownership",
    description: "Axiom is governed by its members. AXM token holders vote on proposals, elect council members, and shape the future of the platform together."
  },
  {
    icon: "🔒",
    title: "Security First",
    description: "Multi-signature wallets, audited smart contracts, and enterprise-grade infrastructure protect member assets and platform operations."
  },
  {
    icon: "🌱",
    title: "Sustainability",
    description: "From carbon credits to renewable energy infrastructure, Axiom is built to be environmentally responsible and economically sustainable."
  },
];

const MILESTONES = [
  { year: "2024", event: "Axiom concept development and smart contract architecture design" },
  { year: "Q1 2025", event: "Core infrastructure deployed on Arbitrum One with 29 verified smart contracts" },
  { year: "Q2 2025", event: "DePIN node operator program launch and institutional partnerships" },
  { year: "Q3 2025", event: "Real estate tokenization framework and DeFi treasury product rollout" },
  { year: "Q1 2026", event: "Token Generation Event (TGE) and Universe Blockchain (L3) launch" },
];

export default function AboutUs() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Origin Story</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Axiom was not created in a lab. It was born from real-world execution: a community land purchase, 
            USDA-supported development, and the founder's ongoing commitment to building infrastructure for shared ownership.
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-3xl p-8 md:p-12 mb-16">
          <div className="flex items-center gap-4 mb-6">
            <img 
              src="/images/axiom-token.png" 
              alt="Axiom Token" 
              className="w-16 h-16 rounded-full shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">The Farmland Proof</h2>
              <p className="text-amber-600 font-medium">We Built the Model Before We Built the Platform</p>
            </div>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed mb-6">
            Before Axiom existed as software, a real community came together, pooled funds, acquired six acres of farmland, 
            and developed it into a working farm with USDA support. Real people. Real land. Real outcomes.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            That experience proved shared ownership works. It also proved most groups fail because coordination breaks down. 
            Axiom exists to turn what already worked into a repeatable system that can scale responsibly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Lessons Learned</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Most shared ownership efforts rely on personal trust, informal agreements, scattered records, 
              and manual coordination. That works at small scale until it does not.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Axiom replaces fragile coordination with structure: clear participation paths, 
              transparent records, and systems designed to reduce confusion, conflict, 
              and dependency on personalities.
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8">Founder Commitment</h2>
            <p className="text-gray-600 leading-relaxed">
              The founder obtained a commercial driver's license, operates as an over-the-road contractor, 
              and is building toward his own authority. This is a commitment to internalizing the full stack 
              of real asset development — from land acquisition to transportation infrastructure.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full blur-2xl opacity-30"></div>
              <img 
                src="/images/axiom-token.png" 
                alt="Axiom Token" 
                className="relative w-64 h-64 rounded-full shadow-2xl shadow-amber-200"
              />
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Makes Axiom Different</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {VALUES.map((value, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-amber-200 transition-all">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">The Axiom Ecosystem</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <div className="text-4xl mb-3">🏗️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">DePIN Infrastructure</h3>
              <p className="text-sm text-gray-600">
                Decentralized physical infrastructure powering the smart city — validators, storage, compute, IoT, and network nodes.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <div className="text-4xl mb-3">🏦</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">DeFi Treasury</h3>
              <p className="text-sm text-gray-600">
                Full-service on-chain DeFi with 30+ products — vaults, staking, payments, credit scoring, and more. Not a bank.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <div className="text-4xl mb-3">🏘️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Real Estate</h3>
              <p className="text-sm text-gray-600">
                Tokenized land parcels, property registry, smart leases, and capital pools for development across 1,000 acres.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <div className="text-4xl mb-3">🗳️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">DAO Governance</h3>
              <p className="text-sm text-gray-600">
                Community-owned and governed. Stake AXM, delegate voting power, and shape the city's future together.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-amber-200 hidden md:block"></div>
            <div className="space-y-6">
              {MILESTONES.map((milestone, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-16 h-16 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center flex-shrink-0 z-10">
                    <span className="text-amber-700 font-bold text-xs text-center">{milestone.year}</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 hover:shadow-md transition-shadow">
                    <p className="text-gray-700">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">1,000</div>
            <div className="text-gray-600">Acres of Land</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">29</div>
            <div className="text-gray-600">Smart Contracts</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">15B</div>
            <div className="text-gray-600">AXM Total Supply</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">30+</div>
            <div className="text-gray-600">DeFi Products</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Official AXM Token Contract</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Token Name</span>
                  <span className="font-bold text-white text-lg">Axiom Protocol Token</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Token Symbol</span>
                  <span className="font-bold text-amber-400 text-lg">AXM</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Network</span>
                  <span className="font-bold text-white">Arbitrum One</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Chain ID</span>
                  <span className="font-bold text-white">42161</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Token Standard</span>
                  <span className="font-bold text-white">ERC-20</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Decimals</span>
                  <span className="font-bold text-white">18</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Total Supply</span>
                  <span className="font-bold text-white">15,000,000,000 AXM</span>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <span className="block text-gray-400 text-xs mb-1">Contract Status</span>
                  <span className="font-bold text-green-400">Verified ✓</span>
                </div>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <span className="block text-amber-400 text-xs mb-2 font-semibold">Contract Address</span>
                <code className="text-amber-300 font-mono text-sm md:text-base break-all">
                  0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
                </code>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <a 
                  href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-lg text-center hover:bg-amber-600 transition-colors"
                >
                  View on Blockscout
                </a>
                <a 
                  href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D?tab=contract"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-gray-700 text-white font-bold rounded-lg text-center hover:bg-gray-600 transition-colors"
                >
                  Verified Source Code
                </a>
                <a 
                  href="https://arbitrum.blockscout.com/token/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-gray-700 text-white font-bold rounded-lg text-center hover:bg-gray-600 transition-colors"
                >
                  Token Holders
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Business Entity</h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Legal Entity</span>
                  <span className="font-semibold text-gray-900">Axiom Nexus LLC</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Manager</span>
                  <span className="font-semibold text-gray-900">Clarence Fuqua (Sole Member)</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">State of Formation</span>
                  <span className="font-semibold text-gray-900">Mississippi</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Date Established</span>
                  <span className="font-semibold text-gray-900">December 26, 2025</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">EIN</span>
                  <span className="font-semibold text-gray-900">41-3277381</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 text-xs mb-1">Filing Number</span>
                  <span className="font-semibold text-gray-900">1522557</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                  <span className="block text-gray-500 text-xs mb-1">Business Address</span>
                  <span className="font-semibold text-gray-900">270 Trace Colony Park STE B, Ridgeland, MS 39157</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                  <span className="block text-gray-500 text-xs mb-1">Registered Agent</span>
                  <span className="font-semibold text-gray-900">Northwest Registered Agent, Inc.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join the Movement</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Whether you're looking to save, learn, or build — there's a place for you in Axiom. 
            Join our community and start your journey toward financial freedom.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/axiom-nodes" 
              className="px-8 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Become a Node Operator
            </a>
            <a 
              href="/contact" 
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

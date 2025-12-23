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
  { year: "Q1 2025", event: "Core infrastructure deployed on Arbitrum One with 23 verified smart contracts" },
  { year: "Q2 2025", event: "DePIN node operator program launch and institutional partnerships" },
  { year: "Q3 2025", event: "Real estate tokenization framework and banking product rollout" },
  { year: "Q1 2026", event: "Token Generation Event (TGE) and Universe Blockchain (L3) launch" },
];

export default function AboutUs() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">About Axiom</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Building a community-owned digital economy — where discipline, structure, and community create real wealth.
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
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              <p className="text-amber-600 font-medium">Why We're Building Axiom</p>
            </div>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed mb-6">
            To create a transparent, community-owned economic engine that empowers individuals with 
            true financial sovereignty — merging the efficiency of blockchain technology with the 
            tangible value of real-world assets and infrastructure.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            We believe that the wealth of the future should be owned by community members, not controlled by 
            centralized institutions. Axiom is pioneering a new model where every member is a 
            stakeholder, every transaction is transparent, and governance is truly democratic.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Axiom represents a new approach to community wealth building — a 
              member-owned digital economy that merges blockchain innovation with 
              real-world financial tools. We're creating a complete ecosystem where members 
              can learn, save, invest, govern, and build together on-chain.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Unlike traditional financial systems governed by opaque institutions, Axiom operates as a 
              Decentralized Autonomous Organization (DAO) where every major decision is voted 
              on by the community. From treasury allocations to new features, members 
              have direct control over the platform's future.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our goal is to prove that a community-owned financial platform isn't just possible — it's 
              better. More efficient, more transparent, more equitable, and more responsive 
              to the needs of its members.
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Digital Banking</h3>
              <p className="text-sm text-gray-600">
                Full-service on-chain banking with 30+ products — deposits, lending, payments, credit scoring, and more.
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
            <div className="text-4xl font-bold text-amber-600 mb-2">23</div>
            <div className="text-gray-600">Smart Contracts</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">15B</div>
            <div className="text-gray-600">AXM Total Supply</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">30+</div>
            <div className="text-gray-600">Banking Products</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join the Movement</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Whether you're an infrastructure operator, investor, developer, or future citizen — 
            there's a place for you in Axiom. Be part of building the first truly on-chain city.
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

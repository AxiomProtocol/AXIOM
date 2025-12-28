import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/Layout';
import { SUSU_ROUTES } from '../lib/susuRoutes';

const steps = [
  {
    number: 1,
    title: "Form Your Circle",
    description: "Gather 3-12 trusted people who share a common goal. This could be family, friends, coworkers, or community members. Everyone agrees on the contribution amount and schedule.",
    icon: "👥",
    example: "Example: 10 people agree to contribute $100 each month"
  },
  {
    number: 2,
    title: "Everyone Contributes",
    description: "Each round, every member contributes the agreed amount into the shared pot. Contributions are tracked transparently on the blockchain so everyone can see who has paid.",
    icon: "💰",
    example: "Example: Each round, 10 people put in $100 = $1,000 pot"
  },
  {
    number: 3,
    title: "One Person Receives the Pot",
    description: "Each round, one member receives the entire pot. The order is determined when the circle starts - either randomly or by agreement. Everyone takes turns.",
    icon: "🎯",
    example: "Example: Member #1 receives $1,000 in round 1, Member #2 receives $1,000 in round 2, etc."
  },
  {
    number: 4,
    title: "Cycle Continues",
    description: "The cycle continues until every member has received the pot exactly once. After everyone has had their turn, the circle completes successfully.",
    icon: "🔄",
    example: "Example: After 10 rounds, everyone has contributed $1,000 total and received $1,000 once"
  }
];

const benefits = [
  {
    title: "Access Larger Sums",
    description: "Instead of saving alone for months, you can receive a lump sum early in the cycle to make important purchases or investments.",
    icon: "📈"
  },
  {
    title: "Built-in Accountability",
    description: "Group commitment creates social pressure to save consistently. You're less likely to skip when others are counting on you.",
    icon: "🤝"
  },
  {
    title: "No Interest or Fees",
    description: "Unlike loans, you're not paying interest. You contribute the same amount you receive. The only fees are minimal platform fees.",
    icon: "💵"
  },
  {
    title: "Build Credit History",
    description: "Successful completion builds your on-chain credit score through our AxiomScoreSBT, unlocking access to larger financial products.",
    icon: "📊"
  },
  {
    title: "Transparent & Secure",
    description: "All contributions and payouts are recorded on the blockchain. Smart contracts ensure funds are distributed according to the rules.",
    icon: "🔒"
  },
  {
    title: "Community Building",
    description: "Strengthen bonds with people you trust while working toward shared financial goals.",
    icon: "🏛️"
  }
];

const modes = [
  {
    name: "Personal Vault Mode",
    subtitle: "Recommended for New Groups",
    description: "Everyone locks their full contribution upfront. This eliminates default risk because all funds are already secured before the circle begins.",
    howItWorks: [
      "Join and lock your full contribution for all rounds upfront",
      "Funds are held in a smart contract (not pooled with others)",
      "When it's your turn, you automatically receive the pot",
      "If you need to exit early, you get your funds back minus a 10% penalty"
    ],
    bestFor: "New groups, people who don't know each other well yet, anyone wanting maximum security",
    custody: "Smart Contract Custody - Your funds are separated and protected",
    color: "blue"
  },
  {
    name: "Community Pool Mode",
    subtitle: "For Trusted, Established Groups",
    description: "Pay as you go with no upfront lock. More flexible, but requires trust since members could miss payments after receiving their payout.",
    howItWorks: [
      "Contribute each round as it happens (no upfront lock)",
      "Funds go into a shared pool",
      "One person receives the pool each round",
      "Continue until everyone has received once"
    ],
    bestFor: "Established groups with proven trust history, family circles, groups that have completed 3+ Personal Vault rounds together",
    custody: "Pooled Custody - Funds are combined in a shared pool",
    color: "amber"
  }
];

const realExamples = [
  {
    title: "The Emergency Fund Circle",
    members: 5,
    contribution: "$200/month",
    pot: "$1,000/month",
    duration: "5 months",
    story: "Maria organized a circle with 4 coworkers. Each contributed $200 monthly. Maria received the first pot and used it for a car repair. Over 5 months, everyone got their turn. Now they've started a second round."
  },
  {
    title: "The Down Payment Club",
    members: 10,
    contribution: "$500/month",
    pot: "$5,000/month",
    duration: "10 months",
    story: "James and his extended family wanted to help each other save for home down payments. With 10 members contributing $500 each, someone receives $5,000 every month. Two members have already used their payouts for down payment assistance."
  },
  {
    title: "The Business Starter",
    members: 8,
    contribution: "$250/week",
    pot: "$2,000/week",
    duration: "8 weeks",
    story: "A group of entrepreneurs in a local business network formed a weekly circle. Each week, one member gets $2,000 to invest in their business. The group has completed 3 successful rounds together."
  }
];

export default function LearnWealthPracticePage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'What Is It?', icon: '📖' },
    { id: 'how-it-works', label: 'How It Works', icon: '⚙️' },
    { id: 'benefits', label: 'Benefits', icon: '✨' },
    { id: 'modes', label: 'Two Modes', icon: '🎯' },
    { id: 'examples', label: 'Real Examples', icon: '💡' },
    { id: 'risks', label: 'Risks & Disclosures', icon: '⚠️' },
    { id: 'get-started', label: 'Get Started', icon: '🚀' }
  ];

  return (
    <Layout showWallet={false}>
      <Head>
        <title>Learn About The Wealth Practice | Axiom</title>
        <meta name="description" content="Understand how The Wealth Practice works - a group savings system where members contribute regularly and take turns receiving the pot. Build wealth together, on-chain." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center text-4xl shadow-lg mx-auto mb-6">
              🏛️
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">The Wealth Practice</h1>
            <p className="text-xl text-black/80 max-w-2xl mx-auto mb-6">
              A time-tested group savings system, now powered by blockchain transparency and security.
            </p>
            <p className="text-lg font-medium">Build Wealth Together, On-Chain</p>
          </div>
        </div>

        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex overflow-x-auto py-3 gap-2 scrollbar-hide">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    activeSection === section.id
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{section.icon}</span>
                  <span className="text-sm">{section.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
          <section id="overview" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">What Is The Wealth Practice?</h2>
            
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
              <p className="text-lg text-gray-300 mb-4">
                <strong className="text-yellow-400">The Wealth Practice</strong> is a modern take on an ancient tradition. 
                For centuries, communities around the world have used <strong className="text-white">rotating savings groups</strong> 
                (called SUSU in Africa, Tandas in Latin America, Chit Funds in India) to help members access larger sums of money.
              </p>
              <p className="text-gray-400">
                The concept is simple: a group of trusted people contribute a fixed amount regularly, 
                and each round, one person receives the entire pot. By the end of the cycle, everyone has 
                contributed the same total amount and received the same total amount - but they got access 
                to a large sum when they needed it.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">The Simple Math</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">10</div>
                  <div className="text-gray-400">Members</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">$100</div>
                  <div className="text-gray-400">Each Per Round</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="text-3xl text-yellow-400 mb-2">$1,000</div>
                  <div className="text-gray-400">Pot Per Round</div>
                </div>
              </div>
              <p className="text-center text-gray-400 mt-4">
                Each round, someone receives $1,000. After 10 rounds, everyone has paid $1,000 total and received $1,000 once.
              </p>
            </div>
          </section>

          <section id="how-it-works" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">How It Works</h2>
            
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={step.number} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xl">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{step.icon}</span>
                        <h3 className="text-xl font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-gray-300 mb-3">{step.description}</p>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-sm text-yellow-400">
                        {step.example}
                      </div>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <div className="w-0.5 h-8 bg-gray-700"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <span>🔗</span> Why Blockchain?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <strong className="text-white">Transparency:</strong> Every contribution and payout is recorded publicly on the blockchain. No disputes about who paid.
                </div>
                <div>
                  <strong className="text-white">Automation:</strong> Smart contracts automatically distribute funds when conditions are met. No need to trust a middleman.
                </div>
                <div>
                  <strong className="text-white">Credit Building:</strong> Your successful participation builds an on-chain credit score that unlocks future opportunities.
                </div>
                <div>
                  <strong className="text-white">Insurance:</strong> Our SUSU Insurance Fund helps cover losses if someone defaults, protecting the group.
                </div>
              </div>
            </div>
          </section>

          <section id="benefits" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">Why Join a Wealth Practice?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-yellow-500/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{benefit.icon}</div>
                    <div>
                      <h3 className="font-bold text-white mb-1">{benefit.title}</h3>
                      <p className="text-sm text-gray-400">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="modes" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">Two Ways to Participate</h2>
            <p className="text-gray-400 mb-6">
              We offer two modes to match your trust level and preferences. Most new groups should start with Personal Vault Mode.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {modes.map((mode, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-2xl border-2 overflow-hidden ${
                    mode.color === 'blue' 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-amber-500 bg-amber-500/5'
                  }`}
                >
                  <div className={`p-4 ${mode.color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                    <h3 className="font-bold text-lg text-black">{mode.name}</h3>
                    <p className="text-sm text-black/70">{mode.subtitle}</p>
                  </div>
                  <div className="p-5">
                    <p className="text-gray-300 mb-4">{mode.description}</p>
                    
                    <h4 className="font-semibold text-white mb-2">How it works:</h4>
                    <ul className="space-y-2 mb-4">
                      {mode.howItWorks.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className={mode.color === 'blue' ? 'text-blue-400' : 'text-amber-400'}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className={`rounded-lg p-3 text-sm ${
                      mode.color === 'blue' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                    }`}>
                      <strong className={mode.color === 'blue' ? 'text-blue-400' : 'text-amber-400'}>Best for:</strong>
                      <span className="text-gray-300 ml-2">{mode.bestFor}</span>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <strong>Custody:</strong> {mode.custody}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-purple-400 mb-3">Graduation Path</h3>
              <div className="flex items-center gap-4 flex-wrap text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                  <span>Start with Personal Vault</span>
                </div>
                <span className="text-gray-600">→</span>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                  <span>Complete 3+ rounds</span>
                </div>
                <span className="text-gray-600">→</span>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center text-sm font-bold">3</span>
                  <span>Unlock Community Pool</span>
                </div>
              </div>
            </div>
          </section>

          <section id="examples" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">Real-World Examples</h2>
            
            <div className="space-y-4">
              {realExamples.map((example, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-yellow-400">{example.title}</h3>
                    <div className="text-sm text-gray-500">{example.duration}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{example.members}</div>
                      <div className="text-xs text-gray-500">Members</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{example.contribution}</div>
                      <div className="text-xs text-gray-500">Each Contributes</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{example.pot}</div>
                      <div className="text-xs text-gray-500">Pot Size</div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">{example.story}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="risks" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">Risks & Important Disclosures</h2>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <span>⚠️</span> Important: Understand the Risks
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Not FDIC Insured:</strong> Cryptocurrency deposits are not insured by any government agency. This is not a bank account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>You Can Lose Money:</strong> If group members don't follow the rules (especially in Community Pool mode), you could lose your contribution.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Smart Contract Risk:</strong> While we audit our contracts, software bugs could potentially affect funds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Crypto Volatility:</strong> If you're using cryptocurrency, its value may change during the savings cycle.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Not Investment Advice:</strong> This is not an investment product and does not promise profits or returns.</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <span>🛡️</span> How We Reduce Risk
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><strong>Personal Vault Mode:</strong> Funds are locked upfront, eliminating default risk.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><strong>SUSU Insurance Fund:</strong> 5% of node rewards go to an insurance fund that can cover defaults.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><strong>On-Chain Credit Scores:</strong> Bad actors build negative history that follows them.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><strong>Graduated Trust:</strong> Groups must prove themselves in Personal Vault before accessing Community Pool.</span>
                </li>
              </ul>
            </div>
          </section>

          <section id="get-started" className="scroll-mt-20">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
            
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🏛️</div>
                <h3 className="text-2xl font-bold text-white mb-2">Build Wealth Together, On-Chain</h3>
                <p className="text-gray-400">Join thousands of members practicing collective wealth building</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link 
                  href={SUSU_ROUTES.GROUPS_NEARBY_PATH || "/susu"}
                  className="block bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl p-5 text-center transition-all transform hover:scale-105"
                >
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-lg mb-1">Find a Group</div>
                  <div className="text-sm text-black/70">Join an existing circle near you</div>
                </Link>

                <Link 
                  href={SUSU_ROUTES.START_CIRCLE_PATH || "/susu/create"}
                  className="block bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl p-5 text-center transition-all"
                >
                  <div className="text-3xl mb-2">✨</div>
                  <div className="font-bold text-lg mb-1">Start a Circle</div>
                  <div className="text-sm text-gray-400">Organize your own group</div>
                </Link>

                <Link 
                  href="/susu-faq"
                  className="block bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl p-5 text-center transition-all"
                >
                  <div className="text-3xl mb-2">❓</div>
                  <div className="font-bold text-lg mb-1">Read FAQ</div>
                  <div className="text-sm text-gray-400">Common questions answered</div>
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="bg-gray-800 py-8">
          <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500 space-y-2">
            <p>This page is for informational purposes only and does not constitute financial, legal, or investment advice.</p>
            <p>Participation involves risk. Consult qualified professionals for advice specific to your situation.</p>
            <p>Not FDIC insured. Not a bank. Axiom Nexus LLC provides coordination tools, not financial products.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

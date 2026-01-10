import { useState } from 'react';

interface ExplainerSection {
  id: string;
  title: string;
  icon: string;
  content: string[];
  highlight?: string;
}

const SECTIONS: ExplainerSection[] = [
  {
    id: 'veaxm',
    title: 'Vote-Escrowed AXM (veAXM)',
    icon: '🔐',
    content: [
      'Lock your AXM tokens for 1-4 years to receive veAXM',
      'Longer locks = more voting power (4 years = 100%)',
      'Your voting power decreases linearly until unlock',
      'veAXM holders earn 50% of all protocol fees',
      'Participate in governance decisions that shape Axiom'
    ],
    highlight: 'Real Yield + Governance Power'
  },
  {
    id: 'credit',
    title: 'On-Chain Credit Score',
    icon: '📊',
    content: [
      'Soulbound Token (SBT) that tracks your payment history',
      'Score range: 300-850 (like traditional FICO)',
      'Builds from Wealth Practice participation',
      'On-time payments increase your score',
      'Defaults lower your score and affect future opportunities',
      'Higher scores unlock better rates and larger credit lines'
    ],
    highlight: 'Build Your Financial Reputation On-Chain'
  },
  {
    id: 'insurance',
    title: 'SUSU Insurance Fund',
    icon: '🛡️',
    content: [
      '5% of all DePIN node rewards are diverted to the fund',
      'Covers defaults in The Wealth Practice circles',
      'Maximum payout: 80% of the default amount',
      'Claims are reviewed within 48 hours',
      'Protects circle members from individual defaults'
    ],
    highlight: 'Community Protection'
  },
  {
    id: 'feeburner',
    title: 'Fee Burner & Buyback',
    icon: '🔥',
    content: [
      '0.5% fee on all DeFi products (vaults, staking, etc.)',
      '50% of fees used to buy back AXM from the DEX',
      'Purchased AXM is permanently burned (sent to 0xdead)',
      '50% of fees distributed to veAXM holders as real yield',
      'Creates constant buy pressure and reduces supply'
    ],
    highlight: 'Deflationary Tokenomics'
  }
];

export default function TokenomicsExplainer() {
  const [expandedSection, setExpandedSection] = useState<string | null>('veaxm');

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📚</span> How Axiom V2 Works
        </h3>
        <p className="text-gray-400 text-sm mt-1">Understanding the DeFi Treasury System</p>
      </div>

      <div className="divide-y divide-gray-700">
        {SECTIONS.map(section => (
          <div key={section.id}>
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div className="text-left">
                  <h4 className="font-semibold text-white">{section.title}</h4>
                  {section.highlight && (
                    <span className="text-xs text-yellow-400">{section.highlight}</span>
                  )}
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSection === section.id && (
              <div className="px-4 pb-4 pl-14">
                <ul className="space-y-2">
                  {section.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-t border-gray-700">
        <h4 className="font-semibold text-white mb-2">The Flywheel Effect</h4>
        <div className="flex items-center justify-between text-sm text-gray-400 flex-wrap gap-2">
          <span className="bg-gray-800 px-3 py-1 rounded-full">Lock AXM</span>
          <span className="text-yellow-500">→</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">Earn Fees</span>
          <span className="text-yellow-500">→</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">Burn AXM</span>
          <span className="text-yellow-500">→</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">Price Rises</span>
          <span className="text-yellow-500">→</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">More Lock</span>
        </div>
      </div>
    </div>
  );
}

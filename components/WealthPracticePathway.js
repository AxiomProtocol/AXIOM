import { useState } from 'react';

export default function WealthPracticePathway({ compact = false, onModeSelect }) {
  const [expanded, setExpanded] = useState(false);

  const phases = [
    {
      step: 1,
      name: 'Personal Vault',
      title: 'Build Trust',
      custody: 'Smart Contract',
      custodyColor: 'blue',
      icon: '🔐',
      description: 'Start here. Everyone commits upfront to their own personal vault. No one can default because funds are already locked.',
      benefits: [
        'Your funds stay separate from others',
        'Protected from group defaults',
        'Automatic payouts when it\'s your turn',
        '10% penalty if you need to exit early'
      ],
      requirement: 'New groups and new connections',
      recommended: true
    },
    {
      step: 2,
      name: 'Community Pool',
      title: 'Graduate Together',
      custody: 'Pooled',
      custodyColor: 'amber',
      icon: '👥',
      description: 'After proving trust through 3+ successful Solo rounds, groups can graduate to pooled mode for larger investments.',
      benefits: [
        'Pay as you go (no upfront lock)',
        'Larger group sizes (up to 50)',
        'More flexibility',
        'Best for established, trusted groups'
      ],
      requirement: '3+ successful rounds OR 6+ months of trust',
      recommended: false
    }
  ];

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-semibold text-gray-800">The Wealth Practice Pathway</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:underline"
          >
            {expanded ? 'Less' : 'Learn more'}
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">Step 1</span>
          <span className="text-gray-600">Personal Vault (build trust)</span>
          <span className="text-gray-400">→</span>
          <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">Step 2</span>
          <span className="text-gray-600">Community Pool (graduate)</span>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 text-sm">
            <p className="text-gray-700">
              <strong>Why this order?</strong> New groups start with Personal Vaults where everyone locks funds upfront. 
              This builds trust because no one can default. After 3+ successful rounds, 
              groups can graduate to Community Pools for more flexibility.
            </p>
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <span>⚠️</span>
              <span>
                <strong>Not FDIC insured.</strong> Cryptocurrency deposits are not insured by any government agency. 
                You may lose your deposit. Smart contract risks apply.
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-amber-500 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎯</span>
          <div>
            <h2 className="text-xl font-bold">The Wealth Practice Pathway</h2>
            <p className="text-white/80">Your 2-step journey to building wealth together</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {phases.map((phase, idx) => (
            <div 
              key={phase.step}
              className={`relative rounded-xl border-2 p-5 transition-all ${
                phase.recommended 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {phase.recommended && (
                <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Start Here
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  phase.recommended ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {phase.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{phase.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      phase.custodyColor === 'blue' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {phase.custody} Custody
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{phase.title}</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{phase.description}</p>

              <div className="space-y-1.5 mb-4">
                {phase.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={phase.recommended ? 'text-blue-500' : 'text-amber-500'}>✓</span>
                    <span className="text-gray-600">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500 bg-white rounded-lg p-2">
                <strong>When to use:</strong> {phase.requirement}
              </div>

              {onModeSelect && (
                <button
                  onClick={() => onModeSelect(phase.step === 1 ? 'solo' : 'pooled')}
                  className={`mt-4 w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                    phase.recommended
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {phase.recommended ? 'Start with Personal Vault' : 'View Community Pools'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span>📊</span> How Groups Graduate
          </h4>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
              <span>Complete 3+ Personal Vault rounds</span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</span>
              <span>All members in good standing</span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>Unlock Community Pool access</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500">⚠️</span>
            <div className="text-sm text-amber-800">
              <strong>Important Disclosures:</strong> Not FDIC insured. Cryptocurrency deposits are not insured 
              by any government agency. Smart contract risks apply. You may lose your entire deposit. 
              Past performance does not guarantee future results.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

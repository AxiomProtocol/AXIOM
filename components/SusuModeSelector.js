import { useState } from 'react';

const WEALTH_PRACTICE_MODES = {
  pooled: {
    id: 'pooled',
    name: 'Community Pool',
    icon: '🤝',
    tagline: 'Traditional Wealth Practice',
    subtitle: 'Build Together, Grow Together',
    description: 'Join a trusted circle where members contribute each cycle. Funds pool together and rotate to each member in turn - the time-tested way communities have built wealth for generations.',
    custodyType: 'Pooled Custody',
    custodyColor: 'amber',
    howItWorks: [
      'Join or create a circle with 2-50 members',
      'Contribute a fixed amount each cycle (weekly, bi-weekly, or monthly)',
      'Each cycle, one member receives the full pot',
      'Continue until everyone has received once'
    ],
    features: [
      'Pay as you go - no large upfront commitment',
      'Classic SUSU experience trusted for generations',
      'Flexible timing - contribute during each cycle window',
      'Community accountability keeps everyone on track'
    ],
    considerations: [
      'Funds are pooled with other members',
      'If a member defaults, it may affect payouts',
      'Works best with people you know and trust'
    ],
    bestFor: 'Groups with established trust - family, friends, coworkers, or community members who know each other personally.',
    commitment: 'Contribute each cycle as you go'
  },
  solo: {
    id: 'solo',
    name: 'Personal Vault',
    icon: '🔐',
    tagline: 'Self-Custody Wealth Practice',
    subtitle: 'Your Money, Your Control',
    description: 'Lock your full commitment in your personal vault from day one. Your funds stay segregated and protected until it\'s your turn to receive - perfect for circles where you\'re meeting new people.',
    custodyType: 'Smart Contract Custody',
    custodyColor: 'blue',
    howItWorks: [
      'Join or create a circle with 2-20 members',
      'Lock your total commitment upfront in YOUR personal vault',
      'Smart contract automatically releases payouts each cycle',
      'Receive the combined amount when it\'s your turn'
    ],
    features: [
      'Your funds stay in YOUR vault - not mixed with others',
      'Protected from defaults - other members can\'t affect your locked funds',
      'Automatic payouts enforced by smart contract',
      'Exit anytime if needed (10% penalty applies)'
    ],
    considerations: [
      'Requires full commitment locked upfront',
      'Funds are locked until circle completes or you exit',
      'Early exit incurs a 10% penalty (distributed to remaining members)'
    ],
    bestFor: 'New connections or online communities where you\'re meeting people for the first time. Maximum security for your commitment.',
    commitment: 'Lock full amount upfront (contribution × number of members)'
  }
};

export default function SusuModeSelector({ selectedMode, onModeSelect, disabled = false, contributionAmount = 100, memberCount = 5 }) {
  const [showDetails, setShowDetails] = useState(false);
  const [expandedMode, setExpandedMode] = useState(null);

  const getCustodyBadgeClass = (color) => {
    switch(color) {
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const totalCommitment = contributionAmount * memberCount;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Wealth Practice Style</h3>
        <p className="text-gray-600 text-sm max-w-lg mx-auto">
          The Wealth Practice offers two ways to save together. Choose based on your group's trust level and preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.values(WEALTH_PRACTICE_MODES).map((mode) => (
          <div key={mode.id} className="flex flex-col">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onModeSelect(mode.id)}
              className={`flex-1 text-left p-5 rounded-xl border-2 transition-all ${
                selectedMode === mode.id
                  ? mode.id === 'solo' 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{mode.icon}</span>
                  <div>
                    <h4 className="font-bold text-gray-900">{mode.name}</h4>
                    <p className="text-xs text-gray-500">{mode.tagline}</p>
                  </div>
                </div>
                {selectedMode === mode.id && (
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    ✓
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-gray-700 mb-2">{mode.subtitle}</p>
              <p className="text-sm text-gray-600 mb-3">{mode.description}</p>

              <div className="flex items-center justify-between">
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCustodyBadgeClass(mode.custodyColor)}`}>
                  {mode.custodyType}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedMode(expandedMode === mode.id ? null : mode.id);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {expandedMode === mode.id ? 'Less info' : 'Learn more'}
                </button>
              </div>
            </button>

            {expandedMode === mode.id && (
              <div className={`mt-2 p-4 rounded-lg border ${
                mode.id === 'solo' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-800 mb-2">How It Works</h5>
                  <ol className="space-y-1">
                    {mode.howItWorks.map((step, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="font-bold text-gray-500">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold text-green-700 mb-2">Benefits</h5>
                  <ul className="space-y-1">
                    {mode.features.map((feature, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold text-amber-700 mb-2">Things to Know</h5>
                  <ul className="space-y-1">
                    {mode.considerations.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500">!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Best For</p>
                  <p className="text-sm text-gray-700">{mode.bestFor}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedMode === 'solo' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <p className="font-semibold text-blue-800">Personal Vault Mode Selected</p>
              <p className="text-sm text-blue-700 mt-1">
                When you join this Wealth Practice circle, you'll lock <strong>{totalCommitment.toLocaleString()} AXM</strong> (your contribution × {memberCount} members) in your personal vault. 
                This protects you from others defaulting - your funds stay safe until it's your turn to receive.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Need to exit early? You can withdraw anytime with a 10% penalty. The penalty goes to remaining members.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedMode === 'pooled' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="font-semibold text-amber-800">Community Pool Mode Selected</p>
              <p className="text-sm text-amber-700 mt-1">
                You'll contribute <strong>{contributionAmount.toLocaleString()} AXM</strong> each cycle. 
                Funds pool together with other members, and one person receives the pot each round.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                This mode works best with people you know and trust. If someone misses a payment, it may delay payouts.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          {showDetails ? 'Hide' : 'Show'} detailed comparison
        </button>
      </div>

      {showDetails && (
        <div className="bg-gray-50 rounded-xl p-6 mt-4">
          <h4 className="font-bold text-gray-900 mb-4 text-center">The Wealth Practice: Mode Comparison</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600">Feature</th>
                  <th className="text-center py-2 px-4 text-amber-700">🤝 Community Pool</th>
                  <th className="text-center py-2 pl-4 text-blue-700">🔐 Personal Vault</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 pr-4 text-gray-600">Upfront Commitment</td>
                  <td className="text-center py-2 px-4">Pay as you go</td>
                  <td className="text-center py-2 pl-4">Full amount locked</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-600">Max Members</td>
                  <td className="text-center py-2 px-4">2-50</td>
                  <td className="text-center py-2 pl-4">2-20</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-600">Default Protection</td>
                  <td className="text-center py-2 px-4">Trust-based</td>
                  <td className="text-center py-2 pl-4">Funds segregated</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-600">Early Exit</td>
                  <td className="text-center py-2 px-4">Reputation impact</td>
                  <td className="text-center py-2 pl-4">10% penalty</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-600">Best For</td>
                  <td className="text-center py-2 px-4">Known groups</td>
                  <td className="text-center py-2 pl-4">New connections</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-blue-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 text-center">
              <strong>Not sure which to choose?</strong> If you're joining with friends or family you trust, 
              <span className="text-amber-700 font-medium"> Community Pool</span> is the classic experience. 
              If you're connecting with new people online, 
              <span className="text-blue-700 font-medium"> Personal Vault</span> gives you maximum protection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { WEALTH_PRACTICE_MODES };

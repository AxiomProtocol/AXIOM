import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const STEPS = [
  { id: 1, title: 'Get Started', icon: '📧', description: 'Enter your email to begin' },
  { id: 2, title: 'Connect Wallet', icon: '🔗', description: 'Link your crypto wallet' },
  { id: 3, title: 'Choose Hub', icon: '🏠', description: 'Select your Interest Hub' },
  { id: 4, title: 'Join Group', icon: '👥', description: 'Pick a Purpose Group' },
];

export default function GuidedOnboarding({ onComplete, onDismiss, initialReferralCode }) {
  const { walletState, connectWallet } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedMode, setSelectedMode] = useState('community');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [referralCode, setReferralCode] = useState(initialReferralCode || '');
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
    } else if (typeof window !== 'undefined') {
      const storedCode = localStorage.getItem('axiom_referral_code');
      if (storedCode) setReferralCode(storedCode);
    }
  }, [initialReferralCode]);

  useEffect(() => {
    if (walletState.isConnected && currentStep === 2) {
      loadHubs();
    }
  }, [walletState.isConnected, currentStep]);

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralCode }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setCurrentStep(2);
      } else {
        setError(data.error || 'Failed to start onboarding');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    setLoading(true);
    try {
      await connectWallet();
    } catch (err) {
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadHubs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/match-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode: selectedMode,
          walletAddress: walletState.address,
        }),
      });
      const data = await res.json();
      if (data.success && data.hubs) {
        setHubs(data.hubs);
        setCurrentStep(3);
      } else {
        setError(data.error || 'Failed to load hubs');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHubSelect = async (hub) => {
    setSelectedHub(hub);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/match-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode: selectedMode,
          walletAddress: walletState.address,
          hubId: hub.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.groups) {
        setGroups(data.groups);
        setCurrentStep(4);
      } else {
        const defaultGroups = [
          { id: 'starter', name: 'Wealth Starters', description: 'Perfect for beginners', contributionAmount: '$100/month', members: 8 },
          { id: 'builders', name: 'Wealth Builders', description: 'For consistent savers', contributionAmount: '$250/month', members: 12 },
          { id: 'accelerators', name: 'Wealth Accelerators', description: 'Fast-track your goals', contributionAmount: '$500/month', members: 6 },
        ];
        setGroups(defaultGroups);
        setCurrentStep(4);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleJoinGroup = async () => {
    if (!selectedGroup) {
      setError('Please select a group to join');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          hubId: selectedHub?.id,
          groupId: selectedGroup?.id,
          walletAddress: walletState.address,
          email,
          mode: selectedMode,
          referralCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onComplete?.(data);
      } else {
        setError(data.error || 'Failed to join group');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Start your wealth-building journey in under 2 minutes
      </p>
      <div>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
        />
      </div>
      <button
        onClick={handleEmailSubmit}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Continue →'}
      </button>
      <p className="text-xs text-gray-500 text-center">
        No wallet required to start. You can connect one later.
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Connect your wallet to participate in Wealth Practices and earn rewards
      </p>
      <button
        onClick={handleWalletConnect}
        disabled={loading || walletState.isConnected}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {walletState.isConnected ? (
          <>
            <span className="text-green-400">✓</span> Wallet Connected
          </>
        ) : loading ? (
          'Connecting...'
        ) : (
          <>
            <span>🦊</span> Connect MetaMask
          </>
        )}
      </button>
      {walletState.isConnected && (
        <button
          onClick={loadHubs}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
        >
          {loading ? 'Loading Hubs...' : 'Continue to Select Hub →'}
        </button>
      )}
      <button
        onClick={loadHubs}
        className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        Skip wallet for now →
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm mb-2">
        Join an Interest Hub to connect with like-minded members in your area
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {hubs.length > 0 ? hubs.map((hub) => (
          <button
            key={hub.id}
            onClick={() => handleHubSelect(hub)}
            disabled={loading}
            className="w-full p-3 rounded-xl border-2 border-gray-700 hover:border-yellow-500/50 text-left transition-all bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏠</span>
              <div className="flex-1">
                <h4 className="font-bold text-white">{hub.name}</h4>
                <p className="text-xs text-gray-400">{hub.description || `${hub.memberCount || 0} members`}</p>
              </div>
              <span className="text-gray-500">→</span>
            </div>
          </button>
        )) : (
          <div className="text-center py-4">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-gray-400">Loading Interest Hubs...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🏠</span>
        <span className="text-sm text-yellow-500">{selectedHub?.name}</span>
      </div>
      <p className="text-gray-400 text-sm">
        Choose a Purpose Group to start saving together
      </p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupSelect(group)}
            className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
              selectedGroup?.id === group.id
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 hover:border-green-500/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div className="flex-1">
                <h4 className="font-bold text-white">{group.name}</h4>
                <p className="text-xs text-gray-400">{group.contributionAmount} • {group.members} members</p>
              </div>
              {selectedGroup?.id === group.id && (
                <span className="text-green-500">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
      {selectedGroup && (
        <button
          onClick={handleJoinGroup}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
        >
          {loading ? 'Joining...' : `🎉 Join ${selectedGroup.name}`}
        </button>
      )}
      <button
        onClick={() => setCurrentStep(3)}
        className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← Choose different hub
      </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Start Your Journey</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300">
            ✕
          </button>
        )}
      </div>

      <div className="flex justify-between mb-6">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${
              step.id <= currentStep ? 'text-yellow-500' : 'text-gray-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 ${
                step.id < currentStep
                  ? 'bg-green-500 text-white'
                  : step.id === currentStep
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              {step.id < currentStep ? '✓' : step.icon}
            </div>
            <span className="text-xs hidden sm:block">{step.title}</span>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <h4 className="text-lg font-semibold text-white mb-1">
          {STEPS[currentStep - 1].title}
        </h4>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          🔒 Protected by SUSU Insurance Fund • No lock-ups • Leave anytime
        </p>
      </div>
    </div>
  );
}

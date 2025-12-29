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
  const [categories, setCategories] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState(null);
  const [newGroupContribution, setNewGroupContribution] = useState('100');

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
      if (data.success) {
        setGroups(data.groups || []);
        setCategories(data.categories || []);
        setCurrentStep(4);
      } else {
        setError(data.error || 'Failed to load groups');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setShowCreateGroup(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (!newGroupCategory) {
      setError('Please select a category');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubId: selectedHub?.id,
          categoryId: newGroupCategory,
          groupName: newGroupName,
          contributionAmount: newGroupContribution,
          walletAddress: walletState.address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedGroup(data.group);
        setShowCreateGroup(false);
        handleJoinGroup(data.group);
      } else {
        setError(data.error || 'Failed to create group');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupOverride) => {
    const groupToJoin = groupOverride || selectedGroup;
    if (!groupToJoin) {
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
          groupId: groupToJoin?.id,
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
          {loading ? 'Loading Hubs...' : 'Browse Interest Hubs →'}
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
      <div className="flex justify-between items-center mb-2">
        <p className="text-gray-400 text-sm">Select your Interest Hub</p>
        <span className="text-xs text-yellow-500">{hubs.length} available</span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                <p className="text-xs text-gray-400">{hub.description}</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-yellow-500 font-bold">{hub.memberCount}</span>
                <p className="text-xs text-gray-500">members</p>
              </div>
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏠</span>
          <span className="text-sm text-yellow-500">{selectedHub?.name}</span>
        </div>
        <span className="text-xs text-gray-500">{groups.length} groups</span>
      </div>

      {!showCreateGroup ? (
        <>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {groups.length > 0 ? groups.map((group) => (
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
                  <span className="text-2xl">{group.icon || '👥'}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{group.name}</h4>
                    <p className="text-xs text-gray-400">{group.contributionAmount}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-green-500 font-bold">{group.members}/{group.maxMembers}</span>
                    <p className="text-xs text-gray-500">{group.spotsLeft} spots left</p>
                  </div>
                </div>
              </button>
            )) : (
              <div className="text-center py-6 bg-gray-800/50 rounded-xl border border-dashed border-gray-600">
                <p className="text-gray-400 mb-2">No groups in this hub yet</p>
                <p className="text-sm text-gray-500">Be the first to create one!</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full py-3 border-2 border-dashed border-yellow-500/50 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/10 transition-all flex items-center justify-center gap-2"
          >
            <span>➕</span> Create New Purpose Group
          </button>

          {selectedGroup && (
            <button
              onClick={() => handleJoinGroup()}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Joining...' : `🎉 Join ${selectedGroup.name}`}
            </button>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <h5 className="text-white font-semibold">Create a New Purpose Group</h5>
          
          <input
            type="text"
            placeholder="Group Name (e.g., Home Buyers 2025)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm"
          />

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {(categories.length > 0 ? categories : [
                { id: 1, name: 'Emergency Fund', icon: '🏥' },
                { id: 2, name: 'Home Purchase', icon: '🏠' },
                { id: 3, name: 'Business Capital', icon: '💼' },
                { id: 4, name: 'Education', icon: '🎓' },
                { id: 5, name: 'Travel', icon: '✈️' },
                { id: 6, name: 'Investment', icon: '📈' },
              ]).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewGroupCategory(cat.id)}
                  className={`p-2 rounded-lg border text-xs text-left transition-all ${
                    newGroupCategory === cat.id
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span> {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Monthly Contribution</label>
            <select
              value={newGroupContribution}
              onChange={(e) => setNewGroupContribution(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 text-sm"
            >
              <option value="50">$50/month</option>
              <option value="100">$100/month</option>
              <option value="250">$250/month</option>
              <option value="500">$500/month</option>
              <option value="1000">$1,000/month</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : '✨ Create & Join Group'}
          </button>

          <button
            onClick={() => setShowCreateGroup(false)}
            className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to existing groups
          </button>
        </div>
      )}

      {!showCreateGroup && (
        <button
          onClick={() => setCurrentStep(3)}
          className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Choose different hub
        </button>
      )}
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

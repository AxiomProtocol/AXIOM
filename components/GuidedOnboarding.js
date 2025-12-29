import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const STEPS = [
  { id: 1, title: 'Get Started', icon: '📧', description: 'Enter your email to begin' },
  { id: 2, title: 'Connect Wallet', icon: '🔗', description: 'Link your crypto wallet' },
  { id: 3, title: 'Choose Your Path', icon: '🎯', description: 'Select Community or Capital Mode' },
  { id: 4, title: 'Join a Circle', icon: '👥', description: 'Get matched with your first group' },
];

export default function GuidedOnboarding({ onComplete, onDismiss, initialReferralCode }) {
  const { walletState, connectWallet } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchedCircle, setMatchedCircle] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [referralCode, setReferralCode] = useState(initialReferralCode || '');

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
      setCurrentStep(3);
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

  const handleModeSelect = async (mode) => {
    setSelectedMode(mode);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/match-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode,
          walletAddress: walletState.address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchedCircle(data.circle);
        setCurrentStep(4);
      } else {
        setError(data.error || 'Failed to find a matching circle');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCircle = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          circleId: matchedCircle?.id,
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
        setError(data.error || 'Failed to join circle');
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
      <button
        onClick={() => setCurrentStep(3)}
        className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        Skip for now →
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm mb-4">
        Choose how you want to build wealth with your community
      </p>
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => handleModeSelect('community')}
          disabled={loading}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            selectedMode === 'community'
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 hover:border-green-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h4 className="font-bold text-white">Community Mode</h4>
              <p className="text-sm text-gray-400">Up to $1,000/month • Perfect for beginners</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => handleModeSelect('capital')}
          disabled={loading}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            selectedMode === 'capital'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-gray-700 hover:border-yellow-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">💎</span>
            <div>
              <h4 className="font-bold text-white">Capital Mode</h4>
              <p className="text-sm text-gray-400">$1,000+/month • Access larger opportunities</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      {matchedCircle ? (
        <>
          <div className="bg-gray-800 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🎯</span>
              <div>
                <h4 className="font-bold text-white">{matchedCircle.name}</h4>
                <p className="text-sm text-gray-400">{matchedCircle.members} members • {matchedCircle.contributionAmount}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {matchedCircle.tags?.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleJoinCircle}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Joining...' : '🎉 Join This Circle'}
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Choose different mode
          </button>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-400">Finding the perfect circle for you...</p>
        </div>
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

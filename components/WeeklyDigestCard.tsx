import { useState } from 'react';

interface DigestStats {
  axmBurned: number;
  veAxmRewards: number;
  insuranceFundGrowth: number;
  newSusuCircles: number;
  newNodeOperators: number;
  totalTransactions: number;
  periodStart: string;
  periodEnd: string;
}

interface Props {
  walletAddress?: string;
  isSubscribed?: boolean;
  email?: string;
  latestDigest?: DigestStats;
  onSubscribe?: (email: string) => void;
  onUnsubscribe?: () => void;
}

export default function WeeklyDigestCard({ 
  walletAddress, 
  isSubscribed = false, 
  email = '', 
  latestDigest,
  onSubscribe,
  onUnsubscribe 
}: Props) {
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [inputEmail, setInputEmail] = useState(email);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!inputEmail || !inputEmail.includes('@')) return;
    setLoading(true);
    await onSubscribe?.(inputEmail);
    setLoading(false);
    setShowSubscribe(false);
  };

  const formatNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📬</span> Weekly Protocol Digest
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {isSubscribed ? 'Subscribed to weekly updates' : 'Get protocol activity summaries'}
            </p>
          </div>
          {isSubscribed ? (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                ✓ Subscribed
              </span>
              <button 
                onClick={onUnsubscribe}
                className="text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                Unsubscribe
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowSubscribe(true)}
              className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Subscribe
            </button>
          )}
        </div>
      </div>

      {showSubscribe && !isSubscribed && (
        <div className="p-6 bg-gray-800/50 border-b border-gray-700">
          <div className="flex gap-3">
            <input
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
            <button 
              onClick={handleSubscribe}
              disabled={loading || !inputEmail}
              className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Confirm'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Receive weekly summaries of burns, rewards, and protocol activity
          </p>
        </div>
      )}

      <div className="p-6">
        {latestDigest ? (
          <>
            <div className="text-sm text-gray-400 mb-4">
              Week of {new Date(latestDigest.periodStart).toLocaleDateString()} - {new Date(latestDigest.periodEnd).toLocaleDateString()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-400">🔥 {formatNumber(latestDigest.axmBurned)}</div>
                <div className="text-xs text-gray-400">AXM Burned</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">💰 {formatNumber(latestDigest.veAxmRewards)}</div>
                <div className="text-xs text-gray-400">veAXM Rewards</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">🛡️ +${formatNumber(latestDigest.insuranceFundGrowth)}</div>
                <div className="text-xs text-gray-400">Insurance Growth</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">⭕ +{latestDigest.newSusuCircles}</div>
                <div className="text-xs text-gray-400">New SUSU Circles</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-400">📡 +{latestDigest.newNodeOperators}</div>
                <div className="text-xs text-gray-400">New Operators</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">📊 {formatNumber(latestDigest.totalTransactions)}</div>
                <div className="text-xs text-gray-400">Transactions</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-400">No digest available yet</p>
            <p className="text-sm text-gray-500 mt-1">Subscribe to receive the first digest this week</p>
          </div>
        )}
      </div>
    </div>
  );
}

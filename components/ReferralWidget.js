import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

export default function ReferralWidget({ compact = false }) {
  const { walletState } = useWallet();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletState.address) {
      fetchReferralData();
    } else {
      setLoading(false);
    }
  }, [walletState.address]);

  const fetchReferralData = async () => {
    try {
      const res = await fetch(`/api/referrals?address=${walletState.address}`);
      const data = await res.json();
      if (data.success) {
        setReferralCode(data.stats?.referralCode || '');
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching referral:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!walletState.address) return;
    setLoading(true);
    try {
      const res = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletState.address }),
      });
      const data = await res.json();
      if (data.success) {
        setReferralCode(data.referralCode);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error generating code:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${referralCode}`;
    const text = `Join me on Axiom for structured financial coordination! Get bonus AXM tokens when you sign up: ${link}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!walletState.isConnected) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${compact ? '' : 'p-6'}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <span>🔗</span>
          <span className="text-sm">Connect wallet to get your referral link</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-bold text-white text-sm">Invite Friends, Earn Rewards</p>
              <p className="text-xs text-gray-400">Get 5 USDC for each referral</p>
            </div>
          </div>
          {referralCode ? (
            <button
              onClick={copyLink}
              className="px-3 py-2 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-1"
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          ) : (
            <button
              onClick={generateCode}
              disabled={loading}
              className="px-3 py-2 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Get Link'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🎁</span>
        <div>
          <h3 className="text-xl font-bold text-white">Refer & Earn</h3>
          <p className="text-sm text-gray-400">Invite friends and earn instant rewards</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.totalReferrals || 0}</p>
            <p className="text-xs text-gray-400">Referrals</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">${stats.totalRewardsEarned || '0'}</p>
            <p className="text-xs text-gray-400">Earned</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-500">${stats.pendingRewards || '0'}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-400 mb-2">Your Referral Link</p>
        {referralCode ? (
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${referralCode}`}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm truncate"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        ) : (
          <button
            onClick={generateCode}
            disabled={loading}
            className="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Referral Link'}
          </button>
        )}
      </div>

      {referralCode && (
        <div className="flex gap-2">
          <button
            onClick={shareOnTwitter}
            className="flex-1 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>
          <button
            onClick={() => {
              const link = `${window.location.origin}/join?ref=${referralCode}`;
              window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Axiom for structured financial coordination!')}`, '_blank');
            }}
            className="flex-1 py-2 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Telegram
          </button>
        </div>
      )}

      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span>💰</span>
          <p className="text-sm text-green-400">
            <strong>Earn $5 USDC</strong> for each friend who joins a Wealth Practice!
          </p>
        </div>
      </div>
    </div>
  );
}

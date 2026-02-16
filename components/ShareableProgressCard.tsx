import React, { useState, useEffect, useRef } from 'react';

interface ProgressData {
  totalXP: number;
  totalAXM: number;
  streakDays: number;
  questsCompleted: number;
  susuRotations: number;
  creditScore: number;
  rank: string;
  referralCode: string;
}

interface ShareableProgressCardProps {
  walletAddress?: string;
  compact?: boolean;
}

export default function ShareableProgressCard({ walletAddress, compact = false }: ShareableProgressCardProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProgress();
  }, [walletAddress]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/social/progress-card${walletAddress ? `?wallet=${walletAddress}` : ''}`);
      const data = await res.json();
      setProgress(data);
    } catch (error) {
      setProgress({
        totalXP: 0,
        totalAXM: 0,
        streakDays: 0,
        questsCompleted: 0,
        susuRotations: 0,
        creditScore: 300,
        rank: 'Newcomer',
        referralCode: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateShareCard = async () => {
    if (!walletAddress) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/social/generate-share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      const data = await res.json();
      setShareUrl(data.shareUrl || '');
    } finally {
      setGenerating(false);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`I'm building wealth with Axiom! 🏦\n\n✨ ${progress?.totalXP || 0} XP earned\n🔥 ${progress?.streakDays || 0} day streak\n💰 ${progress?.totalAXM || 0} AXM rewards\n\nJoin me and earn rewards together:`);
    const url = encodeURIComponent(`${window.location.origin}/join?ref=${progress?.referralCode || ''}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/join?ref=${progress?.referralCode || ''}`;
    navigator.clipboard.writeText(link);
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'Newcomer': 'from-gray-500 to-gray-600',
      'Builder': 'from-blue-500 to-blue-600',
      'Achiever': 'from-purple-500 to-purple-600',
      'Champion': 'from-yellow-500 to-amber-600',
      'Legend': 'from-pink-500 to-rose-600',
    };
    return colors[rank] || colors['Newcomer'];
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
        <div className="h-48 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-indigo-400 flex items-center gap-2">
            <span className="text-xl">📊</span> Share Progress
          </h3>
          <span className={`text-xs bg-gradient-to-r ${getRankColor(progress?.rank || 'Newcomer')} text-white px-2 py-1 rounded-full`}>
            {progress?.rank || 'Newcomer'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <div className="text-lg font-bold text-white">{progress?.totalXP || 0}</div>
            <div className="text-xs text-gray-400">XP</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">{progress?.totalAXM || 0}</div>
            <div className="text-xs text-gray-400">AXM</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-400">{progress?.streakDays || 0}</div>
            <div className="text-xs text-gray-400">Streak</div>
          </div>
        </div>
        <button
          onClick={shareToTwitter}
          className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm transition-all"
        >
          Share Your Journey
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📊</span> Shareable Progress Card
          </h2>
          <p className="text-gray-400 mt-1">Share your wealth-building journey with friends</p>
        </div>
      </div>

      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-gray-900 via-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-2xl">
              🏛️
            </div>
            <div>
              <div className="font-bold text-white text-lg">Axiom Wealth Practice</div>
              <div className={`text-sm bg-gradient-to-r ${getRankColor(progress?.rank || 'Newcomer')} bg-clip-text text-transparent font-bold`}>
                {progress?.rank || 'Newcomer'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">{progress?.creditScore || 300}</div>
            <div className="text-xs text-gray-400">Credit Score</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">✨</div>
            <div className="text-xl font-bold text-white">{progress?.totalXP || 0}</div>
            <div className="text-xs text-gray-400">Total XP</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xl font-bold text-yellow-400">{progress?.totalAXM || 0}</div>
            <div className="text-xs text-gray-400">AXM Earned</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xl font-bold text-orange-400">{progress?.streakDays || 0}</div>
            <div className="text-xs text-gray-400">Day Streak</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xl font-bold text-green-400">{progress?.questsCompleted || 0}</div>
            <div className="text-xs text-gray-400">Quests Done</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span className="text-sm text-gray-300">{progress?.susuRotations || 0} Wealth Practice Rotations</span>
          </div>
          <div className="text-sm text-indigo-400 font-medium">
            Join with code: {progress?.referralCode || 'AXIOM'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={shareToTwitter}
          className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <span>🐦</span> Share on X
        </button>
        <button
          onClick={copyShareLink}
          className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <span>📋</span> Copy Link
        </button>
        <button
          onClick={generateShareCard}
          disabled={generating || !walletAddress}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          {generating ? (
            <>Generating...</>
          ) : (
            <><span>🖼️</span> Download Card</>
          )}
        </button>
      </div>

      {shareUrl && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
          <div className="text-sm text-green-400 mb-2">Card Generated!</div>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-green-300 underline break-all">
            {shareUrl}
          </a>
        </div>
      )}
    </div>
  );
}

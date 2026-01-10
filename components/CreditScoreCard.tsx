import { useState, useEffect } from 'react';

interface CreditProfile {
  score: number;
  totalLoans: number;
  successfulRepayments: number;
  defaults: number;
  lastUpdated: number;
  isActive: boolean;
}

interface CreditScoreData {
  hasProfile: boolean;
  score: number | null;
  tier: string;
  color: string;
  profile: CreditProfile | null;
  totalProfiles: number;
}

interface CreditScoreCardProps {
  walletAddress: string;
  compact?: boolean;
  className?: string;
}

export default function CreditScoreCard({ walletAddress, compact = false, className = '' }: CreditScoreCardProps) {
  const [data, setData] = useState<CreditScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchCreditScore();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchCreditScore = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/v2/credit-score?address=${walletAddress}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch credit score (${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Unable to load credit score');
      }
    } catch (err: any) {
      console.error('Error fetching credit score:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-emerald-400';
    if (score >= 740) return 'text-green-400';
    if (score >= 670) return 'text-yellow-400';
    if (score >= 580) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 800) return 'from-emerald-500 to-green-500';
    if (score >= 740) return 'from-green-500 to-teal-500';
    if (score >= 670) return 'from-yellow-500 to-amber-500';
    if (score >= 580) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  const getScorePercent = (score: number) => {
    return Math.max(0, Math.min(100, ((score - 300) / 550) * 100));
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 border border-red-500/30 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-sm font-semibold text-red-400 mb-2">Unable to Load Credit Score</h3>
          <p className="text-gray-500 text-xs">{error}</p>
          <button
            onClick={fetchCreditScore}
            className="mt-3 text-xs text-yellow-500 hover:text-yellow-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.hasProfile) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Credit Score Yet</h3>
          <p className="text-gray-400 text-sm mb-4">
            Build your on-chain credit history by participating in The Wealth Practice circles and making on-time payments.
          </p>
          <div className="text-xs text-gray-500">
            Base score: 500 | Range: 300-850
          </div>
        </div>
      </div>
    );
  }

  const score = data.score || 500;
  const profile = data.profile;

  if (compact) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Axiom Credit Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-xs text-gray-500">{data.tier}</div>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#374151" strokeWidth="6" />
              <circle 
                cx="32" cy="32" r="28" fill="none" 
                className={`stroke-current ${getScoreColor(score)}`}
                strokeWidth="6"
                strokeDasharray={`${getScorePercent(score) * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      <div className={`bg-gradient-to-r ${getScoreGradient(score)} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Axiom Credit Score</h3>
            <p className="text-white/70 text-sm">On-Chain Credit History (SBT)</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">{score}</div>
            <div className="text-white/70 text-sm">{data.tier}</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Score Range</span>
            <span className="text-gray-400">300 - 850</span>
          </div>
          <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="h-full bg-red-500 w-[20%]" />
              <div className="h-full bg-orange-500 w-[15%]" />
              <div className="h-full bg-yellow-500 w-[15%]" />
              <div className="h-full bg-green-500 w-[20%]" />
              <div className="h-full bg-emerald-500 w-[30%]" />
            </div>
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-gray-900"
              style={{ left: `calc(${getScorePercent(score)}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Very Good</span>
            <span>Excellent</span>
          </div>
        </div>

        {profile && (
          <div className="border-t border-gray-700 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-white">Payment History</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{profile.successfulRepayments}</div>
                <div className="text-xs text-gray-400">On-Time</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{profile.totalLoans}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{profile.defaults}</div>
                <div className="text-xs text-gray-400">Defaults</div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
          Powered by AxiomScoreSBT (ERC-5192 Soulbound Token)
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  pendingEarnings: number;
  referralCode: string;
}

interface Referral {
  id: number;
  referredAddress: string;
  nodeTier: string;
  bonusAmount: number;
  status: string;
  createdAt: string;
}

interface Props {
  walletAddress?: string;
}

export default function NodeReferralWidget({ walletAddress }: Props) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchReferralData();
    }
  }, [walletAddress]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/nodes/referrals?wallet=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/axiom-nodes?ref=${stats?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!walletAddress) {
    return (
      <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6 text-center">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-gray-400">Connect wallet to see your referral stats</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/2"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔗</span> Node Referral Bonuses
        </h3>
        <p className="text-sm text-gray-400 mt-1">Earn 5% when you refer new node operators</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats?.totalReferrals || 0}</div>
            <div className="text-xs text-gray-400">Total Referrals</div>
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">${(stats?.totalEarned || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Earned</div>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">${(stats?.pendingEarnings || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-400 mb-2">Your Referral Link</div>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-900 rounded-lg px-4 py-2 font-mono text-sm text-yellow-500 overflow-hidden text-ellipsis">
              {typeof window !== 'undefined' && `${window.location.origin}/axiom-nodes?ref=${stats?.referralCode || 'loading'}`}
            </div>
            <button 
              onClick={copyReferralLink}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black hover:bg-yellow-400'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this link. Earn 5% of every node purchase from the insurance fund.
          </p>
        </div>

        {referrals.length > 0 ? (
          <div>
            <div className="text-sm text-gray-400 mb-3">Recent Referrals</div>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <span className="font-mono text-sm text-white">{formatAddress(ref.referredAddress)}</span>
                    <span className="text-xs text-gray-500 ml-2">{ref.nodeTier}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${ref.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                      +${ref.bonusAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{ref.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No referrals yet. Share your link to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

interface InsuranceClaim {
  id: number;
  claimantAddress: string;
  susuPoolName: string;
  claimAmount: number;
  claimReason: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedAt: string;
  resolvedAt?: string;
  txHash?: string;
}

interface Props {
  limit?: number;
  showPending?: boolean;
}

export default function InsuranceClaimsHistory({ limit = 10, showPending = true }: Props) {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, totalPaid: 0 });
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetchClaims();
  }, [filter]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/insurance/claims?limit=${limit}&status=${filter}`);
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims || []);
        setStats(data.stats || { total: 0, approved: 0, pending: 0, totalPaid: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const statusConfig = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '⏳' },
    approved: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '✅' },
    rejected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '❌' },
    paid: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '💰' },
  };

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Insurance Claims History
            </h3>
            <p className="text-sm text-gray-400 mt-1">Public record of Wealth Practice protection claims</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Claims</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-xs text-gray-400">Approved</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">${stats.totalPaid.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Paid</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800 flex gap-2">
        {(['all', 'approved', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-yellow-500 text-black' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : claims.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <p className="text-gray-400">No claims found</p>
          <p className="text-sm text-gray-500 mt-1">The insurance fund is ready to protect Wealth Practice circles</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {claims.map((claim) => {
            const config = statusConfig[claim.status];
            return (
              <div key={claim.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
                        {config.icon} {claim.status}
                      </span>
                      <span className="text-white font-medium">{claim.susuPoolName}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{claim.claimReason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Claimant: {formatAddress(claim.claimantAddress)}</span>
                      <span>Submitted: {formatDate(claim.submittedAt)}</span>
                      {claim.resolvedAt && <span>Resolved: {formatDate(claim.resolvedAt)}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ${claim.claimAmount.toLocaleString()}
                    </div>
                    {claim.txHash && (
                      <a 
                        href={`https://arbiscan.io/tx/${claim.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-yellow-500 hover:underline"
                      >
                        View TX
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

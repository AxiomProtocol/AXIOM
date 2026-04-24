import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

interface ClaimEvent {
  id: string;
  epoch: number;
  amount: string;
  timestamp: number;
  txHash: string;
}

export default function ClaimHistory() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const [claims, setClaims] = useState<ClaimEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClaimed, setTotalClaimed] = useState('0');

  useEffect(() => {
    if (address) {
      fetchClaimHistory();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchClaimHistory = async () => {
    try {
      const res = await fetch(`/api/v2/claim-history?address=${address}`);
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims || []);
        setTotalClaimed(data.totalClaimed || '0');
      }
    } catch (err) {
      console.error('Error fetching claim history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (val: string) => {
    const num = parseFloat(val);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(4);
  };

  const shortenTx = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (!walletState.isConnected) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="text-center text-gray-400">
          Connect wallet to view claim history
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-green-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">📜</span> Claim History
        </h3>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total Claimed</p>
          <p className="text-lg font-bold text-green-400">{formatNumber(totalClaimed)} AXM</p>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <p className="text-gray-400">No claims yet</p>
          <p className="text-gray-500 text-sm mt-1">Lock AXM as veAXM to start earning rewards</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {claims.map((claim) => (
            <div 
              key={claim.id}
              className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-green-500/30 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">+{formatNumber(claim.amount)} AXM</p>
                  <p className="text-xs text-gray-400 mt-1">Epoch {claim.epoch}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{formatDate(claim.timestamp)}</p>
                  <a
                    href={`https://arbiscan.io/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block"
                  >
                    {shortenTx(claim.txHash)} ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Rewards are distributed from the 0.5% fee switch on all banking products
        </p>
      </div>
    </div>
  );
}

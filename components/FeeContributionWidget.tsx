import { useMemo } from 'react';

interface Props {
  transactionAmount: number;
  tokenSymbol?: string;
  showDetails?: boolean;
}

const FEE_RATE_BPS = 50;
const BURN_PERCENTAGE = 50;
const SEED_PERCENTAGE = 50;

export default function FeeContributionWidget({ 
  transactionAmount, 
  tokenSymbol = 'AXM',
  showDetails = true 
}: Props) {
  const feeBreakdown = useMemo(() => {
    const feeAmount = transactionAmount * (FEE_RATE_BPS / 10000);
    const burnAmount = feeAmount * (BURN_PERCENTAGE / 100);
    const seedAmount = feeAmount * (SEED_PERCENTAGE / 100);
    
    return {
      total: feeAmount,
      burn: burnAmount,
      seedRewards: seedAmount,
      feePercent: FEE_RATE_BPS / 100
    };
  }, [transactionAmount]);

  if (transactionAmount <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-sm text-gray-300">Protocol Fee Contribution</span>
        </div>
        <span className="text-yellow-400 font-mono text-sm">
          {feeBreakdown.total.toFixed(4)} {tokenSymbol}
        </span>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span>🔥</span>
              <span className="text-xs text-gray-400">Burned Forever</span>
            </div>
            <div className="text-orange-400 font-bold">
              {feeBreakdown.burn.toFixed(4)} {tokenSymbol}
            </div>
            <div className="text-xs text-gray-500">Reduces supply</div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span>🌱</span>
              <span className="text-xs text-gray-400">SEED Rewards</span>
            </div>
            <div className="text-purple-400 font-bold">
              {feeBreakdown.seedRewards.toFixed(4)} {tokenSymbol}
            </div>
            <div className="text-xs text-gray-500">To stakers</div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 text-center">
        {feeBreakdown.feePercent}% fee • 50% burned • 50% to SEED holders
      </div>
    </div>
  );
}

export function FeeContributionBanner({ totalVolume }: { totalVolume: number }) {
  const stats = useMemo(() => {
    const totalFees = totalVolume * (FEE_RATE_BPS / 10000);
    const burned = totalFees * 0.5;
    const distributed = totalFees * 0.5;
    
    return { totalFees, burned, distributed };
  }, [totalVolume]);

  return (
    <div className="bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 border-t border-b border-yellow-500/20 py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span>📊</span>
          <span className="text-gray-400">Protocol Volume:</span>
          <span className="text-white font-semibold">${totalVolume.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🔥</span>
          <span className="text-gray-400">Total Burned:</span>
          <span className="text-orange-400 font-semibold">{stats.burned.toLocaleString()} AXM</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌱</span>
          <span className="text-gray-400">Distributed to SEED:</span>
          <span className="text-purple-400 font-semibold">{stats.distributed.toLocaleString()} AXM</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

interface YieldEstimate {
  daily: string;
  weekly: string;
  monthly: string;
  yearly: string;
  apy: string;
}

export default function YieldCalculator() {
  const [lockAmount, setLockAmount] = useState('1000');
  const [lockYears, setLockYears] = useState(2);
  const [protocolFees, setProtocolFees] = useState('50000');
  const [estimate, setEstimate] = useState<YieldEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateYield();
  }, [lockAmount, lockYears, protocolFees]);

  const calculateYield = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/yield-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockAmount: parseFloat(lockAmount) || 0,
          lockYears,
          monthlyProtocolFees: parseFloat(protocolFees) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setEstimate(data.estimate);
      }
    } catch (err) {
      console.error('Error calculating yield:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val: string) => {
    const num = parseFloat(val);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const lockDurations = [
    { years: 1, label: '1 Year', multiplier: '1x' },
    { years: 2, label: '2 Years', multiplier: '2x' },
    { years: 3, label: '3 Years', multiplier: '3x' },
    { years: 4, label: '4 Years', multiplier: '4x' }
  ];

  const votingPower = (parseFloat(lockAmount) || 0) * lockYears;

  return (
    <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📊</span>
        <h3 className="text-lg font-semibold text-white">Yield Calculator</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">AXM to Lock</label>
          <div className="relative">
            <input
              type="number"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
              placeholder="Enter amount"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">AXM</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Lock Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {lockDurations.map((d) => (
              <button
                key={d.years}
                onClick={() => setLockYears(d.years)}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  lockYears === d.years
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div>{d.label}</div>
                <div className="text-xs opacity-70">{d.multiplier}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Your veAXM Power</span>
            <span className="text-xl font-bold text-yellow-400">{formatNumber(votingPower.toString())}</span>
          </div>
          <p className="text-xs text-gray-500">
            Voting power = AXM locked × years
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Est. Monthly Protocol Fees (AXM)
          </label>
          <input
            type="number"
            value={protocolFees}
            onChange={(e) => setProtocolFees(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
            placeholder="Protocol fees"
          />
          <p className="text-xs text-gray-500 mt-1">
            50% of fees go to veAXM holders
          </p>
        </div>

        {loading ? (
          <div className="animate-pulse h-32 bg-gray-700 rounded-lg"></div>
        ) : estimate ? (
          <div className="bg-gradient-to-br from-yellow-900/30 to-gray-800 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-sm text-gray-400 mb-3">Estimated Rewards</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Daily</p>
                <p className="text-lg font-bold text-yellow-400">{formatNumber(estimate.daily)} AXM</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Weekly</p>
                <p className="text-lg font-bold text-yellow-400">{formatNumber(estimate.weekly)} AXM</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-lg font-bold text-yellow-400">{formatNumber(estimate.monthly)} AXM</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Yearly</p>
                <p className="text-lg font-bold text-yellow-400">{formatNumber(estimate.yearly)} AXM</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-yellow-500/20">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Estimated APY</span>
                <span className="text-2xl font-bold text-green-400">{estimate.apy}%</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-gray-900/30 rounded-lg p-3">
          <p className="text-xs text-gray-500 text-center">
            Estimates based on current protocol activity. Actual rewards depend on total veAXM supply and fee volume.
          </p>
        </div>
      </div>
    </div>
  );
}

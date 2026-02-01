import { useState, useMemo } from 'react';

interface NodeTier {
  tierId: number;
  name: string;
  priceEth: string;
  icon: string;
  apyMin: number;
  apyMax: number;
  category: number;
}

const NODE_TIERS: NodeTier[] = [
  { tierId: 1, name: 'Mobile Light', priceEth: '0.02', icon: '📱', apyMin: 10, apyMax: 15, category: 0 },
  { tierId: 2, name: 'Desktop Standard', priceEth: '0.05', icon: '💻', apyMin: 15, apyMax: 22, category: 1 },
  { tierId: 3, name: 'Desktop Advanced', priceEth: '0.08', icon: '🖥️', apyMin: 20, apyMax: 28, category: 1 },
  { tierId: 4, name: 'Pro Infrastructure', priceEth: '0.15', icon: '🏠', apyMin: 25, apyMax: 35, category: 1 },
  { tierId: 5, name: 'Enterprise Premium', priceEth: '0.25', icon: '🏢', apyMin: 30, apyMax: 45, category: 1 },
];

const ETH_PRICE_USD = 3500;
const AXM_PRICE_USD = 0.05;

interface Props {
  onSelectTier?: (tierId: number) => void;
}

export default function NodeROICalculator({ onSelectTier }: Props) {
  const [selectedTierId, setSelectedTierId] = useState(3);
  const [uptimePercent, setUptimePercent] = useState(95);
  const [holdingMonths, setHoldingMonths] = useState(12);

  const selected = NODE_TIERS.find(t => t.tierId === selectedTierId) || NODE_TIERS[2];

  const calculations = useMemo(() => {
    const priceEth = parseFloat(selected.priceEth);
    const priceUsd = priceEth * ETH_PRICE_USD;
    
    const avgApy = (selected.apyMin + selected.apyMax) / 2;
    const adjustedApy = avgApy * (uptimePercent / 100);
    
    const monthlyRewardPct = adjustedApy / 12 / 100;
    const monthlyRewardUsd = priceUsd * monthlyRewardPct;
    const monthlyRewardAxm = monthlyRewardUsd / AXM_PRICE_USD;
    
    const totalRewardUsd = monthlyRewardUsd * holdingMonths;
    const totalRewardAxm = monthlyRewardAxm * holdingMonths;
    
    const roi = ((totalRewardUsd - priceUsd) / priceUsd) * 100;
    const breakEvenMonths = Math.ceil(priceUsd / monthlyRewardUsd);
    
    return {
      priceEth,
      priceUsd,
      avgApy,
      adjustedApy,
      monthlyRewardUsd,
      monthlyRewardAxm,
      totalRewardUsd,
      totalRewardAxm,
      roi,
      breakEvenMonths,
      netProfitUsd: totalRewardUsd - priceUsd,
      isProfitable: totalRewardUsd > priceUsd
    };
  }, [selected, uptimePercent, holdingMonths]);

  const allTierCalculations = useMemo(() => {
    return NODE_TIERS.map(tier => {
      const priceEth = parseFloat(tier.priceEth);
      const priceUsd = priceEth * ETH_PRICE_USD;
      const avgApy = (tier.apyMin + tier.apyMax) / 2;
      const adjustedApy = avgApy * (uptimePercent / 100);
      const monthlyRewardUsd = priceUsd * (adjustedApy / 12 / 100);
      const yearlyRewardUsd = monthlyRewardUsd * 12;
      const breakEvenMonths = Math.ceil(priceUsd / monthlyRewardUsd);
      
      return {
        ...tier,
        priceUsd,
        adjustedApy,
        yearlyRewardUsd,
        breakEvenMonths
      };
    });
  }, [uptimePercent]);

  return (
    <div className="bg-white/50 border border-green-500/20 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        DePIN Node ROI Calculator
      </h3>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Node Type</label>
          <select
            value={selectedTierId}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setSelectedTierId(id);
              onSelectTier?.(id);
            }}
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:border-green-500 focus:outline-none"
          >
            {NODE_TIERS.map(tier => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.icon} {tier.name} - {tier.priceEth} ETH
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-600 mb-2">Expected Uptime: {uptimePercent}%</label>
          <input
            type="range"
            min="50"
            max="100"
            value={uptimePercent}
            onChange={(e) => setUptimePercent(parseInt(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-gray-600 mb-2">Holding Period: {holdingMonths} months</label>
          <input
            type="range"
            min="1"
            max="36"
            value={holdingMonths}
            onChange={(e) => setHoldingMonths(parseInt(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 mo</span>
            <span>36 mo</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-100/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{selected.icon}</span>
          <div>
            <div className="text-lg font-bold text-gray-900">{selected.name}</div>
            <div className="text-sm text-gray-600">{selected.priceEth} ETH (~${calculations.priceUsd.toLocaleString()})</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-sm text-gray-600">Adjusted APY</div>
            <div className="text-xl font-bold text-green-400">{calculations.adjustedApy.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">at {uptimePercent}% uptime</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-sm text-gray-600">Monthly Rewards</div>
            <div className="text-xl font-bold text-yellow-400">${calculations.monthlyRewardUsd.toFixed(2)}</div>
            <div className="text-xs text-gray-500">{calculations.monthlyRewardAxm.toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-sm text-gray-600">Break-Even</div>
            <div className="text-xl font-bold text-blue-400">{calculations.breakEvenMonths} mo</div>
            <div className="text-xs text-gray-500">to recover cost</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-sm text-gray-600">{holdingMonths}mo Total</div>
            <div className={`text-xl font-bold ${calculations.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
              ${calculations.totalRewardUsd.toFixed(2)}
            </div>
            <div className={`text-xs ${calculations.netProfitUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {calculations.netProfitUsd >= 0 ? '+' : ''}{calculations.roi.toFixed(1)}% ROI
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">All Tiers Comparison (at {uptimePercent}% uptime)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 border-b border-gray-200">
                <th className="text-left py-2">Node</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">APY</th>
                <th className="text-right py-2">Yearly Return</th>
                <th className="text-right py-2">Break-Even</th>
              </tr>
            </thead>
            <tbody>
              {allTierCalculations.map((tier) => (
                <tr 
                  key={tier.tierId} 
                  className={`border-b border-gray-800 cursor-pointer hover:bg-white/30 ${selectedTierId === tier.tierId ? 'bg-green-500/10' : ''}`}
                  onClick={() => setSelectedTierId(tier.tierId)}
                >
                  <td className="py-3 text-gray-900">
                    <span className="mr-2">{tier.icon}</span>
                    {tier.name}
                  </td>
                  <td className="py-3 text-right text-gray-300">${tier.priceUsd.toLocaleString()}</td>
                  <td className="py-3 text-right text-green-400">{tier.adjustedApy.toFixed(1)}%</td>
                  <td className="py-3 text-right text-yellow-400">${tier.yearlyRewardUsd.toFixed(2)}</td>
                  <td className="py-3 text-right text-blue-400">{tier.breakEvenMonths} mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-green-400">💡</span>
          <div className="text-sm text-gray-300">
            <strong className="text-green-400">Pro Tip:</strong> Higher tier nodes have better APY but require more upfront investment. 
            Consider starting with Desktop Standard and upgrading as you earn rewards.
            Maintaining high uptime (95%+) significantly improves your returns.
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';

interface LockOption {
  years: number;
  multiplier: number;
  label: string;
}

const LOCK_OPTIONS: LockOption[] = [
  { years: 1, multiplier: 0.25, label: '1 Year' },
  { years: 2, multiplier: 0.50, label: '2 Years' },
  { years: 3, multiplier: 0.75, label: '3 Years' },
  { years: 4, multiplier: 1.00, label: '4 Years (Max)' },
];

const BASE_APY = 18.5;
const VEAXM_REWARD_SHARE = 0.5;

interface Props {
  axmBalance?: string;
  currentLockYears?: number;
  onSelectDuration?: (years: number) => void;
}

export default function VeAXMLockCalculator({ axmBalance = '0', currentLockYears, onSelectDuration }: Props) {
  const [amount, setAmount] = useState(axmBalance !== '0' ? axmBalance : '1000');
  const [selectedYears, setSelectedYears] = useState(4);

  const calculations = useMemo(() => {
    const lockAmount = parseFloat(amount) || 0;
    
    return LOCK_OPTIONS.map(option => {
      const votingPower = lockAmount * option.multiplier;
      const effectiveApy = BASE_APY * option.multiplier + (BASE_APY * VEAXM_REWARD_SHARE * option.multiplier);
      const yearlyRewards = (lockAmount * effectiveApy) / 100;
      const totalRewards = yearlyRewards * option.years;
      const finalValue = lockAmount + totalRewards;
      const percentGain = lockAmount > 0 ? ((finalValue - lockAmount) / lockAmount) * 100 : 0;
      
      return {
        ...option,
        votingPower,
        effectiveApy,
        yearlyRewards,
        totalRewards,
        finalValue,
        percentGain
      };
    });
  }, [amount]);

  const selected = calculations.find(c => c.years === selectedYears) || calculations[3];

  return (
    <div className="bg-gray-800/50 border border-yellow-500/20 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🔒</span>
        veAXM Lock Duration Calculator
      </h3>
      
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Amount to Lock (AXM)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
          placeholder="Enter AXM amount"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {calculations.map((calc) => (
          <button
            key={calc.years}
            onClick={() => {
              setSelectedYears(calc.years);
              onSelectDuration?.(calc.years);
            }}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedYears === calc.years
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
            } ${currentLockYears && calc.years < currentLockYears ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={currentLockYears !== undefined && calc.years < currentLockYears}
          >
            <div className="text-sm text-gray-400">{calc.label}</div>
            <div className="text-lg font-bold text-yellow-400">{calc.effectiveApy.toFixed(1)}% APY</div>
            <div className="text-xs text-gray-500 mt-1">{calc.multiplier * 100}% voting power</div>
          </button>
        ))}
      </div>

      <div className="bg-gray-900/50 rounded-xl p-4 space-y-3">
        <div className="text-center mb-4">
          <span className="text-gray-400">With {selected.label} lock</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-400">Voting Power</div>
            <div className="text-xl font-bold text-purple-400">{selected.votingPower.toLocaleString()}</div>
            <div className="text-xs text-gray-500">veAXM</div>
          </div>
          
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-400">Yearly Rewards</div>
            <div className="text-xl font-bold text-green-400">{selected.yearlyRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-500">AXM/year</div>
          </div>
          
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-400">Total Rewards</div>
            <div className="text-xl font-bold text-yellow-400">{selected.totalRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-500">over {selected.years} years</div>
          </div>
          
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-400">Final Value</div>
            <div className="text-xl font-bold text-white">{selected.finalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-green-400">+{selected.percentGain.toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400">💡</span>
            <div className="text-sm text-gray-300">
              <strong className="text-yellow-400">Longer locks = Better rewards.</strong> With a 4-year lock, you get maximum voting power and 50% of protocol fees distributed to veAXM holders.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Duration</th>
              <th className="text-right py-2">APY</th>
              <th className="text-right py-2">Voting Power</th>
              <th className="text-right py-2">Total Return</th>
              <th className="text-right py-2">% Gain</th>
            </tr>
          </thead>
          <tbody>
            {calculations.map((calc) => (
              <tr 
                key={calc.years} 
                className={`border-b border-gray-800 ${selectedYears === calc.years ? 'bg-yellow-500/10' : ''}`}
              >
                <td className="py-3 text-white">{calc.label}</td>
                <td className="py-3 text-right text-yellow-400">{calc.effectiveApy.toFixed(1)}%</td>
                <td className="py-3 text-right text-purple-400">{calc.votingPower.toLocaleString()}</td>
                <td className="py-3 text-right text-green-400">{calc.totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM</td>
                <td className="py-3 text-right text-green-400">+{calc.percentGain.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

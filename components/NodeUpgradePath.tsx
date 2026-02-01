import { useState } from 'react';

interface NodeTier {
  id: string;
  name: string;
  price: number;
  apy: number;
  features: string[];
}

const NODE_TIERS: NodeTier[] = [
  { id: 'lite_starter', name: 'Lite Starter', price: 99, apy: 8, features: ['Basic rewards', 'Network support'] },
  { id: 'lite_growth', name: 'Lite Growth', price: 249, apy: 12, features: ['Enhanced rewards', 'Priority support'] },
  { id: 'lite_pro', name: 'Lite Pro', price: 499, apy: 18, features: ['Premium rewards', 'API access'] },
  { id: 'standard_base', name: 'Standard Base', price: 999, apy: 25, features: ['Full node access', 'Governance power'] },
  { id: 'standard_plus', name: 'Standard Plus', price: 2499, apy: 32, features: ['Enhanced emissions', 'Priority routing'] },
  { id: 'standard_max', name: 'Standard Max', price: 4999, apy: 38, features: ['Maximum rewards', 'Exclusive features'] },
  { id: 'pro_operator', name: 'Pro Operator', price: 9999, apy: 45, features: ['Validator status', 'Revenue share'] },
];

interface Props {
  currentNodeId?: string;
  currentNodeTier?: string;
  currentNodePrice?: number;
  walletAddress?: string;
  onUpgrade?: (fromTier: string, toTier: string, payment: number) => void;
}

export default function NodeUpgradePath({ currentNodeId, currentNodeTier, currentNodePrice = 0, walletAddress, onUpgrade }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<NodeTier | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentTierIndex = NODE_TIERS.findIndex(t => t.id === currentNodeTier);
  const upgradeTiers = NODE_TIERS.slice(currentTierIndex + 1);

  const calculateUpgrade = (targetTier: NodeTier) => {
    const credit = currentNodePrice * 0.8; // 80% credit for current node
    const additionalPayment = Math.max(0, targetTier.price - credit);
    const savings = currentNodePrice * 0.8;
    return { credit, additionalPayment, savings };
  };

  if (!currentNodeId || !currentNodeTier) {
    return (
      <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-xl font-bold text-white mb-2">No Node Owned</h3>
          <p className="text-gray-400 mb-4">Purchase your first node to start earning rewards</p>
          <button className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors">
            Browse Nodes
          </button>
        </div>
      </div>
    );
  }

  const currentTier = NODE_TIERS.find(t => t.id === currentNodeTier);

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>⬆️</span> Node Upgrade Path
        </h3>
        <p className="text-sm text-gray-400 mt-1">Upgrade your node with credit toward the difference</p>
      </div>

      <div className="p-6">
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Current Node</div>
              <div className="text-xl font-bold text-white">{currentTier?.name}</div>
              <div className="text-sm text-yellow-500">{currentTier?.apy}% APY</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Original Price</div>
              <div className="text-xl font-bold text-white">${currentNodePrice.toLocaleString()}</div>
              <div className="text-sm text-green-400">80% credit available</div>
            </div>
          </div>
        </div>

        {upgradeTiers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👑</div>
            <p className="text-white font-bold">Maximum Tier Reached!</p>
            <p className="text-gray-400 text-sm">You have the highest tier node available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">Available Upgrades</div>
            {upgradeTiers.map((tier) => {
              const { credit, additionalPayment, savings } = calculateUpgrade(tier);
              const apyIncrease = tier.apy - (currentTier?.apy || 0);
              
              return (
                <div 
                  key={tier.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedTarget?.id === tier.id 
                      ? 'border-yellow-500 bg-yellow-500/10' 
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedTarget(tier)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-white">{tier.name}</div>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          +{apyIncrease}% APY
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-400">
                          Full Price: <span className="text-white">${tier.price.toLocaleString()}</span>
                        </span>
                        <span className="text-green-400">
                          Credit: -${credit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">You Pay</div>
                      <div className="text-2xl font-bold text-yellow-500">
                        ${additionalPayment.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-400">Save ${savings.toLocaleString()}</div>
                    </div>
                  </div>

                  {selectedTarget?.id === tier.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          New APY: <span className="text-yellow-500 font-bold">{tier.apy}%</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirm(true);
                          }}
                          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showConfirm && selectedTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Upgrade</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">From</span>
                <span className="text-white">{currentTier?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">To</span>
                <span className="text-yellow-500 font-bold">{selectedTarget.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Credit Applied</span>
                <span className="text-green-400">-${(currentNodePrice * 0.8).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-white font-bold">Amount Due</span>
                <span className="text-yellow-500 font-bold text-xl">
                  ${calculateUpgrade(selectedTarget).additionalPayment.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onUpgrade?.(currentNodeTier, selectedTarget.id, calculateUpgrade(selectedTarget).additionalPayment);
                  setShowConfirm(false);
                }}
                className="flex-1 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

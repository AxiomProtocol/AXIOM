import React from 'react';
import { NodeType } from '../../types/depin';

interface NodeCardProps {
  node: NodeType;
  onPurchase: (node: NodeType) => void;
  disabled: boolean;
  isOnCorrectNetwork: boolean;
  account: string | null;
}

export function NodeCard({ node, onPurchase, disabled, isOnCorrectNetwork, account }: NodeCardProps) {
  const getButtonText = () => {
    if (!account) return 'Connect Wallet';
    if (!isOnCorrectNetwork) return 'Switch to Arbitrum One';
    if (disabled) return 'Processing...';
    return 'Purchase Node';
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500 transition-all transform hover:scale-105">
      {/* Hardware Tier Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${node.color} text-white font-semibold`}>
          {node.priceUSD}
        </div>
        <div className="text-xs text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full">
          {node.requiredHardwareTier.toUpperCase()} TIER
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-2">{node.name}</h3>
      <div className="text-gray-400 mb-2">{node.price} ETH</div>
      <div className="text-sm text-yellow-400 mb-4">
        💻 {node.hardwareRecommendation}
      </div>

      {/* Services */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">Services Included:</div>
        <div className="space-y-2">
          {node.services.map((service, idx) => (
            <div key={idx} className="flex items-center text-gray-300 text-sm">
              <span className="text-green-400 mr-2">✓</span>
              {service}
            </div>
          ))}
        </div>
      </div>

      {/* Earnings */}
      <div className="border-t border-gray-700 pt-6 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Monthly Earnings:</span>
          <span className="text-green-400 font-semibold">
            ${node.monthlyEarnings.min}-${node.monthlyEarnings.max}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">ROI Period:</span>
          <span className="text-yellow-400 font-semibold">{node.roi}</span>
        </div>
      </div>

      {/* Purchase Button */}
      <button
        onClick={() => onPurchase(node)}
        disabled={disabled || !account || !isOnCorrectNetwork}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {getButtonText()}
      </button>
    </div>
  );
}

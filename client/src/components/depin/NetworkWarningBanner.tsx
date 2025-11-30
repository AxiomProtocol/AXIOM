import React from 'react';

interface NetworkWarningBannerProps {
  currentChainName: string;
  onSwitchNetwork: () => void;
}

export function NetworkWarningBanner({ currentChainName, onSwitchNetwork }: NetworkWarningBannerProps) {
  return (
    <div className="bg-red-500/20 border-b-4 border-red-500 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <div className="text-xl font-bold text-red-400 mb-1">Wrong Network Detected</div>
              <div className="text-white">
                You are currently on <span className="font-semibold text-yellow-400">{currentChainName || 'Unknown Network'}</span>.
                DePIN nodes can only be purchased on <span className="font-semibold text-green-400">Arbitrum One (Chain ID: 42161)</span>.
              </div>
            </div>
          </div>
          <button
            onClick={onSwitchNetwork}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
          >
            Switch to Arbitrum One
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { IncomeStream } from '../../types/depin';

interface IncomeStreamGridProps {
  streams: IncomeStream[];
  userTier?: 'mobile' | 'desktop' | 'professional' | 'enterprise';
}

export function IncomeStreamGrid({ streams, userTier }: IncomeStreamGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map((stream, index) => {
        const isAvailable = !userTier || stream.requiredTier.includes(userTier);
        
        return (
          <div
            key={index}
            className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 transition-all ${
              isAvailable
                ? 'border-yellow-500/30 hover:border-yellow-500/60'
                : 'border-gray-700 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">{stream.icon}</div>
              <div className="text-right">
                <div className={`font-semibold text-sm ${isAvailable ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {stream.rwaType}
                </div>
                <div className="text-gray-500 text-xs mt-1">{stream.contract}</div>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{stream.name}</h3>
            <p className="text-gray-400 mb-4 text-sm">{stream.description}</p>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <span className="text-gray-500 text-sm">Avg Monthly</span>
              <span className={`font-bold ${isAvailable ? 'text-green-400' : 'text-gray-500'}`}>
                {stream.avgMonthly}
              </span>
            </div>
            
            {!isAvailable && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-800/50 rounded px-2 py-1">
                🔒 Requires {stream.requiredTier.filter(t => t !== 'mobile')[0]?.toUpperCase()} tier or higher
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

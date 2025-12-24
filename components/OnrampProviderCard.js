/**
 * Onramp Provider Card - Displays a single provider option
 */

import { useState } from 'react';

const providerLogos = {
  moonpay: '/images/moonpay-logo.svg',
  ramp: '/images/ramp-logo.svg',
  transak: '/images/transak-logo.svg'
};

const providerColors = {
  moonpay: 'from-purple-600 to-purple-800',
  ramp: 'from-green-600 to-green-800',
  transak: 'from-blue-600 to-blue-800'
};

export default function OnrampProviderCard({ 
  provider, 
  onSelect, 
  selected = false,
  disabled = false 
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!provider.enabled) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 opacity-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-400">{provider.name}</h3>
          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">Not Configured</span>
        </div>
        <p className="text-sm text-gray-500">This provider is not yet available. Contact support if needed.</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all cursor-pointer ${
        selected 
          ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
          : 'border-gray-700 hover:border-gray-500'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onSelect(provider.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
          Selected
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${providerColors[provider.id]} flex items-center justify-center`}>
            <span className="text-white font-bold text-lg">{provider.name[0]}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
            <p className="text-xs text-gray-400">Fiat-to-Crypto</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Payment Methods</p>
          <div className="flex flex-wrap gap-1">
            {provider.supportedPayments.slice(0, 3).map((method, idx) => (
              <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {method}
              </span>
            ))}
            {provider.supportedPayments.length > 3 && (
              <span className="text-xs text-gray-400">+{provider.supportedPayments.length - 3}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-400">Fees</p>
            <p className="text-gray-300">{provider.fees}</p>
          </div>
          <div>
            <p className="text-gray-400">Regions</p>
            <p className="text-gray-300 truncate" title={provider.supportedRegions}>
              {provider.supportedRegions.length > 25 
                ? provider.supportedRegions.slice(0, 25) + '...' 
                : provider.supportedRegions}
            </p>
          </div>
        </div>
      </div>

      <button
        className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-all ${
          selected
            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
        disabled={disabled}
      >
        {selected ? 'Selected' : 'Select Provider'}
      </button>
    </div>
  );
}

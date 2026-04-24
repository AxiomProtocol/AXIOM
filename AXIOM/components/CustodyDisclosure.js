import { useState } from 'react';

const CUSTODY_TYPES = {
  self: {
    label: 'Self-Custody',
    color: 'green',
    icon: '🔐',
    shortDescription: 'You hold tokens in your own wallet. Protocol cannot access your funds.',
    fullDescription: 'Your tokens remain in your personal wallet at all times. You control your private keys and have complete authority over your assets. The Axiom protocol cannot move, freeze, or access your funds.',
    warnings: [
      { id: 'no-fdic', text: 'Not FDIC insured. You may lose your entire deposit.' },
      { id: 'volatility', text: 'Cryptocurrency values fluctuate significantly.' },
      { id: 'regulatory', text: 'Regulatory treatment may change and affect services.' },
    ],
  },
  contract: {
    label: 'Smart Contract',
    color: 'blue',
    icon: '📋',
    shortDescription: 'Funds held by audited smart contracts with defined rules.',
    fullDescription: 'Your tokens are held in audited smart contracts on Arbitrum One. You must sign a transaction to deposit, and withdrawals follow contract rules which may include lock-up periods.',
    warnings: [
      { id: 'no-fdic', text: 'Not FDIC insured. You may lose your entire deposit.' },
      { id: 'volatility', text: 'Cryptocurrency values fluctuate significantly.' },
      { id: 'regulatory', text: 'Regulatory treatment may change and affect services.' },
      { id: 'smart-contract', text: 'Smart contract bugs could result in loss of funds.' },
      { id: 'liquidity', text: 'Lock-up periods or withdrawal queues may apply.' },
    ],
  },
  pooled: {
    label: 'Pooled Custody',
    color: 'amber',
    icon: '⚠️',
    shortDescription: 'Funds pooled with other users. Distributions follow group rules.',
    fullDescription: 'Your tokens are combined with funds from other users. Distributions are controlled by rotating group rules or fund managers. You may not withdraw immediately, and your share is proportional.',
    warnings: [
      { id: 'no-fdic', text: 'Not FDIC insured. You may lose your entire deposit.' },
      { id: 'volatility', text: 'Cryptocurrency values fluctuate significantly.' },
      { id: 'regulatory', text: 'Regulatory treatment may change and affect services.' },
      { id: 'smart-contract', text: 'Smart contract bugs could result in loss of funds.' },
      { id: 'counterparty', text: 'Other participants may default, affecting your returns.' },
      { id: 'liquidity', text: 'Lock-up periods or withdrawal queues may apply.' },
    ],
  },
};

export default function CustodyDisclosure({ custodyType = 'pooled', productName = 'This product', compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const custody = CUSTODY_TYPES[custodyType] || CUSTODY_TYPES.pooled;

  const colorClasses = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-500' },
  };

  const colors = colorClasses[custody.color];

  if (compact) {
    return (
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 text-sm`}>
        <div className="flex items-center gap-2">
          <span className={`${colors.badge} text-white px-2 py-0.5 rounded-full text-xs font-bold`}>
            {custody.label}
          </span>
          <span className={colors.text}>{custody.shortDescription}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{custody.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`${colors.badge} text-white px-2 py-1 rounded-full text-xs font-bold`}>
                {custody.label}
              </span>
              <span className={`font-semibold ${colors.text}`}>{productName}</span>
            </div>
            <p className={`text-sm mt-1 ${colors.text}`}>{custody.shortDescription}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-sm font-medium ${colors.text} hover:underline`}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-current/10">
          <p className={`text-sm ${colors.text} mb-4`}>{custody.fullDescription}</p>
          
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase ${colors.text}`}>Risk Acknowledgment</p>
            {custody.warnings.map(warning => (
              <div key={warning.id} className="flex items-start gap-2 text-sm">
                <span className="text-red-500">⚠</span>
                <span className={colors.text}>{warning.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

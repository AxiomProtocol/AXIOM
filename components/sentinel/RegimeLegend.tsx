import { useState } from 'react';

const REGIMES = [
  { key: 'TREND_UP', label: 'Trend Up', color: 'text-dl-forest', bg: 'bg-green-50', description: 'Market showing sustained upward momentum. Moving averages aligned bullishly. Standard allocation permitted.' },
  { key: 'TREND_DOWN', label: 'Trend Down', color: 'text-dl-error', bg: 'bg-red-50', description: 'Market showing sustained downward momentum. Moving averages aligned bearishly. Reduced allocation applied.' },
  { key: 'RANGE_LOW_VOL', label: 'Range / Low Vol', color: 'text-dl-gray', bg: 'bg-gray-50', description: 'Market trading within a defined range with low volatility. No clear directional bias. Standard allocation applied.' },
  { key: 'HIGH_VOL_DISLOCATION', label: 'High Vol Dislocation', color: 'text-dl-gold', bg: 'bg-yellow-50', description: 'Market experiencing elevated volatility with dislocated price action. All non-parameter capital deployment suspended.' },
];

export function RegimeLegend() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="border border-dl-border-light p-4 mb-6">
      <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">REGIME CLASSIFICATION</p>
      <div className="flex flex-wrap gap-2">
        {REGIMES.map((r) => (
          <div key={r.key}>
            <button
              onClick={() => setExpanded(expanded === r.key ? null : r.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === r.key ? null : r.key); } }}
              className={`px-3 py-1 border border-dl-border text-xs font-dl-mono ${r.color} ${expanded === r.key ? r.bg : 'bg-dl-bg'}`}
              aria-expanded={expanded === r.key}
              aria-label={`${r.label} regime classification`}
            >
              {r.label}
            </button>
            {expanded === r.key && (
              <div className={`mt-2 p-3 border border-dl-border-light ${r.bg} text-xs text-dl-gray leading-relaxed`} role="region" aria-label={`${r.label} description`}>
                {r.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

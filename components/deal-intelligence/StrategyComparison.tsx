import { useState, useEffect, useCallback } from 'react';

interface StrategyResult {
  strategy: string;
  label: string;
  viable: boolean;
  viabilityScore: number;
  cashRequired: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  projectedCashFlow: number;
  timeHorizonMonths: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  noiAnnual: number;
  riskFlagCount: number;
  criticalFlags: number;
  topRisks: string[];
  recommendedAction: string;
  extra: Record<string, number>;
}

interface Props {
  dealId: string;
}

function fmt(n: number, type: 'currency' | 'pct' | 'ratio' | 'months' = 'currency'): string {
  if (type === 'currency') {
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  if (type === 'pct') return `${(n * 100).toFixed(1)}%`;
  if (type === 'ratio') return n > 100 ? 'N/A' : n.toFixed(2);
  if (type === 'months') return `${n} mo`;
  return String(n);
}

function viabilityColor(score: number): string {
  if (score >= 70) return 'text-green-700 bg-green-50';
  if (score >= 50) return 'text-yellow-700 bg-yellow-50';
  if (score >= 30) return 'text-orange-700 bg-orange-50';
  return 'text-red-700 bg-red-50';
}

function viabilityBar(score: number): string {
  if (score >= 70) return 'bg-green-600';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function StrategyComparison({ dealId }: Props) {
  const [comparisons, setComparisons] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topStrategy, setTopStrategy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const runComparison = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/real-estate/deals/${dealId}/compare-strategies`);
      const json = await res.json();
      if (json.success) {
        setComparisons(json.comparisons);
        setTopStrategy(json.topStrategy);
        setLoaded(true);
      } else {
        setError(json.error || 'Failed to compare strategies');
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (!loaded) runComparison();
  }, [loaded, runComparison]);

  if (loading) {
    return (
      <div className="border border-dl-border p-8 text-center">
        <p className="font-dl-mono text-sm text-dl-muted">Running all 8 exit strategies against current assumptions...</p>
        <div className="mt-3 mx-auto w-48 h-1 bg-dl-border overflow-hidden">
          <div className="h-full bg-dl-accent animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-dl-border p-6">
        <p className="font-dl-mono text-sm text-red-600">{error}</p>
        <button onClick={runComparison} className="mt-3 px-4 py-2 bg-dl-navy text-white font-dl-mono text-sm">
          Retry
        </button>
      </div>
    );
  }

  const viableStrategies = comparisons.filter(c => c.viable);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy">Multi-Exit Strategy Comparison</h2>
          <p className="text-xs font-dl-mono text-dl-muted mt-1">
            {viableStrategies.length} of {comparisons.length} strategies viable | Top: {comparisons[0]?.label || 'N/A'}
          </p>
        </div>
        <button
          onClick={runComparison}
          className="px-4 py-2 bg-dl-navy text-white font-dl-mono text-xs hover:bg-opacity-90"
        >
          Refresh Analysis
        </button>
      </div>

      {comparisons.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparisons.slice(0, 3).map((c, idx) => (
            <div key={c.strategy} className={`border p-4 ${idx === 0 ? 'border-green-300 bg-green-50' : 'border-dl-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-dl-mono text-xs text-dl-muted uppercase">
                  {idx === 0 ? 'Top Strategy' : `#${idx + 1}`}
                </span>
                <span className={`px-2 py-0.5 text-xs font-dl-mono ${viabilityColor(c.viabilityScore)}`}>
                  {c.viabilityScore}/100
                </span>
              </div>
              <h3 className="font-dl-serif text-base text-dl-navy mb-2">{c.label}</h3>
              <div className="space-y-1 text-xs font-dl-mono">
                <div className="flex justify-between">
                  <span className="text-dl-muted">Cash Required</span>
                  <span className="text-dl-text">{fmt(c.cashRequired)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-muted">Est. Profit</span>
                  <span className={c.estimatedProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {fmt(c.estimatedProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-muted">Cash Flow/yr</span>
                  <span className={c.projectedCashFlow >= 0 ? 'text-dl-text' : 'text-red-700'}>
                    {c.projectedCashFlow ? fmt(c.projectedCashFlow) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-muted">Timeline</span>
                  <span className="text-dl-text">{fmt(c.timeHorizonMonths, 'months')}</span>
                </div>
              </div>
              <p className="text-xs font-dl-body text-dl-muted mt-2 italic">{c.recommendedAction}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border border-dl-border overflow-x-auto">
        <table className="w-full font-dl-mono text-sm">
          <thead>
            <tr className="bg-dl-bg border-b border-dl-border text-left">
              <th className="px-3 py-2 text-xs text-dl-muted uppercase">Strategy</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Viability</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Cash Req.</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Est. Profit</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Cash Flow/yr</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Cap Rate</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">CoC</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">DSCR</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Risks</th>
              <th className="px-3 py-2 text-xs text-dl-muted uppercase text-right">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => (
              <tr key={c.strategy} className={`border-b border-dl-border ${!c.viable ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-dl-text">{c.label}</span>
                    {c.strategy === topStrategy && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700">TOP</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 overflow-hidden">
                      <div className={`h-full ${viabilityBar(c.viabilityScore)}`} style={{ width: `${c.viabilityScore}%` }} />
                    </div>
                    <span className={`text-xs ${viabilityColor(c.viabilityScore).split(' ')[0]}`}>{c.viabilityScore}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-dl-text">{fmt(c.cashRequired)}</td>
                <td className={`px-3 py-2 text-right ${c.estimatedProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt(c.estimatedProfit)}
                </td>
                <td className={`px-3 py-2 text-right ${c.projectedCashFlow >= 0 ? 'text-dl-text' : 'text-red-700'}`}>
                  {c.projectedCashFlow ? fmt(c.projectedCashFlow) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-dl-text">{c.capRate ? fmt(c.capRate, 'pct') : '—'}</td>
                <td className="px-3 py-2 text-right text-dl-text">{fmt(c.cashOnCash, 'pct')}</td>
                <td className="px-3 py-2 text-right text-dl-text">{fmt(c.dscr, 'ratio')}</td>
                <td className="px-3 py-2 text-right">
                  {c.criticalFlags > 0 ? (
                    <span className="text-red-600">{c.criticalFlags}C/{c.riskFlagCount}</span>
                  ) : (
                    <span className="text-dl-text">{c.riskFlagCount}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-dl-text">{fmt(c.timeHorizonMonths, 'months')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h3 className="font-dl-serif text-base text-dl-navy">Strategy Details</h3>
        {comparisons.filter(c => c.viable).map((c) => (
          <div key={c.strategy} className="border border-dl-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-dl-serif text-sm text-dl-navy">{c.label}</h4>
              <span className={`px-2 py-0.5 text-xs font-dl-mono ${viabilityColor(c.viabilityScore)}`}>
                {c.viabilityScore}/100
              </span>
            </div>
            <p className="text-xs font-dl-body text-dl-muted mb-2">{c.recommendedAction}</p>
            {c.topRisks.length > 0 && (
              <div className="space-y-1">
                {c.topRisks.map((risk, i) => (
                  <p key={i} className="text-xs font-dl-mono text-orange-700">- {risk}</p>
                ))}
              </div>
            )}
            {Object.keys(c.extra).length > 0 && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                {Object.entries(c.extra)
                  .filter(([, v]) => typeof v === 'number' && !isNaN(v))
                  .slice(0, 8)
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs font-dl-mono border-b border-dl-border py-0.5">
                      <span className="text-dl-muted">{key.replace(/_/g, ' ')}</span>
                      <span className="text-dl-text">
                        {Math.abs(val as number) > 100 ? fmt(val as number) : (val as number).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

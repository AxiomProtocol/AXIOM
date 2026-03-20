import type { EstimateAssembly } from '../../lib/cost-intelligence/types';

interface Props {
  estimate: EstimateAssembly;
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-dl-forest' : pct >= 60 ? 'text-yellow-700' : 'text-red-600';
  return <span className={`font-dl-mono text-xs ${color}`}>{pct}%</span>;
}

export default function EstimateReview({ estimate }: Props) {
  const hardLines = estimate.lineItems.filter(l => !l.isContingency && !l.isSoftCost);
  const contingencyLine = estimate.lineItems.find(l => l.isContingency);
  const softCostLine = estimate.lineItems.find(l => l.isSoftCost);

  const rehabCostPct = estimate.arvEstimate && estimate.arvEstimate > 0
    ? estimate.grandTotal / estimate.arvEstimate
    : null;

  const byTrade = hardLines.reduce((acc, l) => {
    if (!acc[l.trade]) acc[l.trade] = 0;
    acc[l.trade] += l.lineTotal;
    return acc;
  }, {} as Record<string, number>);

  const tradeSorted = Object.entries(byTrade).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-dl-border p-4">
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Hard Costs</p>
          <p className="font-dl-mono text-lg font-bold text-dl-navy">{fmt(estimate.hardCostTotal)}</p>
        </div>
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Total Budget</p>
          <p className="font-dl-mono text-lg font-bold text-dl-navy">{fmt(estimate.grandTotal)}</p>
          <p className="font-dl-mono text-xs text-dl-muted">{fmt(estimate.costLow)} – {fmt(estimate.costHigh)}</p>
        </div>
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Per Unit</p>
          <p className="font-dl-mono text-lg font-bold text-dl-navy">{fmt(estimate.perUnitCost)}</p>
          <p className="font-dl-mono text-xs text-dl-muted">{estimate.totalUnits} unit{estimate.totalUnits !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Per Sq Ft</p>
          <p className="font-dl-mono text-lg font-bold text-dl-navy">
            {estimate.perSqftCost > 0 ? `$${estimate.perSqftCost.toFixed(2)}` : '—'}
          </p>
          <p className="font-dl-mono text-xs text-dl-muted">Confidence: <ConfidenceBadge value={estimate.confidence} /></p>
        </div>
      </div>

      {(rehabCostPct !== null || contingencyLine || softCostLine) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-dl-border p-4 bg-gray-50">
          {rehabCostPct !== null && (
            <div>
              <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Rehab/ARV</p>
              <p className={`font-dl-mono text-sm font-bold ${rehabCostPct > 0.35 ? 'text-red-600' : rehabCostPct > 0.25 ? 'text-yellow-700' : 'text-dl-forest'}`}>
                {fmtPct(rehabCostPct)}
              </p>
              <p className="font-dl-mono text-xs text-dl-muted">ARV: {fmt(estimate.arvEstimate!)}</p>
            </div>
          )}
          {contingencyLine && (
            <div>
              <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Contingency</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(contingencyLine.lineTotal)}</p>
              <p className="font-dl-mono text-xs text-dl-muted">{fmtPct(estimate.contingencyPct)} of hard costs</p>
            </div>
          )}
          {softCostLine && (
            <div>
              <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Soft Costs</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(softCostLine.lineTotal)}</p>
              <p className="font-dl-mono text-xs text-dl-muted">{fmtPct(estimate.softCostPct)} of hard costs</p>
            </div>
          )}
          <div>
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Region</p>
            <p className="font-dl-mono text-sm font-bold text-dl-navy">{estimate.regionCode}</p>
            <p className="font-dl-mono text-xs text-dl-muted">v{estimate.version} — {estimate.provider}</p>
          </div>
        </div>
      )}

      {tradeSorted.length > 0 && (
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Cost by Trade</p>
          <div className="border border-dl-border overflow-hidden">
            {tradeSorted.map(([trade, total]) => {
              const pct = estimate.hardCostTotal > 0 ? total / estimate.hardCostTotal : 0;
              return (
                <div key={trade} className="border-b border-dl-border last:border-0 px-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-dl-mono text-xs text-dl-text">{trade}</span>
                    <span className="font-dl-mono text-xs text-dl-navy font-bold">{fmt(total)}</span>
                  </div>
                  <div className="h-1 bg-gray-100">
                    <div className="h-1 bg-dl-navy" style={{ width: `${Math.round(pct * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Line Items</p>
        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full font-dl-mono text-xs">
            <thead>
              <tr className="border-b border-dl-border bg-gray-50">
                <th className="text-left px-3 py-2 text-dl-muted uppercase">Trade</th>
                <th className="text-left px-3 py-2 text-dl-muted uppercase">Description</th>
                <th className="text-right px-3 py-2 text-dl-muted uppercase">Qty</th>
                <th className="text-right px-3 py-2 text-dl-muted uppercase">Unit $</th>
                <th className="text-right px-3 py-2 text-dl-muted uppercase">Total</th>
                <th className="text-right px-3 py-2 text-dl-muted uppercase">Conf</th>
              </tr>
            </thead>
            <tbody>
              {hardLines.map((l, i) => (
                <tr key={l.id || i} className="border-b border-dl-border last:border-0">
                  <td className="px-3 py-2 text-dl-muted">{l.trade}</td>
                  <td className="px-3 py-2 text-dl-text">{l.description}</td>
                  <td className="px-3 py-2 text-right text-dl-muted">{l.quantity} {l.unit}</td>
                  <td className="px-3 py-2 text-right text-dl-muted">{fmt(l.unitTotalCost)}</td>
                  <td className="px-3 py-2 text-right font-bold text-dl-navy">{fmt(l.lineTotal)}</td>
                  <td className="px-3 py-2 text-right"><ConfidenceBadge value={l.confidence} /></td>
                </tr>
              ))}
              {contingencyLine && (
                <tr className="border-b border-dl-border bg-yellow-50">
                  <td className="px-3 py-2 text-dl-muted" colSpan={4}>{contingencyLine.description}</td>
                  <td className="px-3 py-2 text-right font-bold text-dl-navy">{fmt(contingencyLine.lineTotal)}</td>
                  <td className="px-3 py-2 text-right"><ConfidenceBadge value={contingencyLine.confidence} /></td>
                </tr>
              )}
              {softCostLine && (
                <tr className="border-b border-dl-border bg-blue-50">
                  <td className="px-3 py-2 text-dl-muted" colSpan={4}>{softCostLine.description}</td>
                  <td className="px-3 py-2 text-right font-bold text-dl-navy">{fmt(softCostLine.lineTotal)}</td>
                  <td className="px-3 py-2 text-right"><ConfidenceBadge value={softCostLine.confidence} /></td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold">
                <td className="px-3 py-2 text-dl-navy" colSpan={4}>TOTAL BUDGET</td>
                <td className="px-3 py-2 text-right text-dl-navy font-bold text-sm">{fmt(estimate.grandTotal)}</td>
                <td className="px-3 py-2 text-right"><ConfidenceBadge value={estimate.confidence} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {estimate.generatedAt && (
        <p className="font-dl-mono text-xs text-dl-muted">
          Generated {new Date(estimate.generatedAt).toLocaleString()} · Provider: {estimate.provider}
        </p>
      )}
    </div>
  );
}

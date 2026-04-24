import type { EstimateAssembly } from '../../lib/cost-intelligence/types';

interface Props {
  estimate: EstimateAssembly;
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface RangeBar {
  label: string;
  value: number;
  color: string;
  description: string;
}

export default function EstimateRangeView({ estimate }: Props) {
  const hardTotal = estimate.hardCostTotal;
  const aggressive = Math.round(hardTotal * 0.9);
  const baseline = hardTotal;
  const conservative = Math.round(hardTotal * 1.15);

  const grandBaseline = estimate.grandTotal;
  const grandAggressive = Math.round(aggressive + estimate.contingencyTotal + estimate.softCostTotal);
  const grandConservative = Math.round(conservative + estimate.contingencyTotal + estimate.softCostTotal);

  const min = Math.min(estimate.costLow, grandAggressive);
  const max = Math.max(estimate.costHigh, grandConservative);
  const span = max - min || 1;

  function barPct(value: number) {
    return Math.round(((value - min) / span) * 100);
  }

  const bars: RangeBar[] = [
    {
      label: 'Low (Confidence-Weighted)',
      value: estimate.costLow,
      color: 'bg-dl-forest',
      description: 'Sum of low-end Craftsman benchmarks × regional factor. Represents best-case scenario if bids come in at floor.',
    },
    {
      label: 'Aggressive Estimate',
      value: grandAggressive,
      color: 'bg-blue-600',
      description: 'Baseline hard costs × 0.90 — assumes efficient contractor bids and no scope creep.',
    },
    {
      label: 'Baseline (Mid)',
      value: grandBaseline,
      color: 'bg-dl-navy',
      description: 'Craftsman mid-point costs × regional factor + contingency + soft costs. Recommended planning figure.',
    },
    {
      label: 'Conservative Estimate',
      value: grandConservative,
      color: 'bg-yellow-600',
      description: 'Baseline hard costs × 1.15 — accounts for scope additions and moderate contractor premium.',
    },
    {
      label: 'High (Confidence-Weighted)',
      value: estimate.costHigh,
      color: 'bg-red-600',
      description: 'Sum of high-end Craftsman benchmarks × regional factor. Represents worst-case scenario.',
    },
  ];

  const rehabArvPct = estimate.arvEstimate && estimate.arvEstimate > 0
    ? (grandBaseline / estimate.arvEstimate * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="border border-dl-border p-4">
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-4">Budget Range — All-In (Hard + Contingency + Soft)</p>
        <div className="space-y-3">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-dl-mono text-xs text-dl-muted">{bar.label}</span>
                <span className="font-dl-mono text-xs font-bold text-dl-navy">{fmt(bar.value)}</span>
              </div>
              <div className="relative h-2 bg-gray-100">
                <div
                  className={`absolute left-0 h-2 ${bar.color}`}
                  style={{ width: `${barPct(bar.value)}%` }}
                />
              </div>
              <p className="font-dl-mono text-xs text-dl-muted mt-0.5">{bar.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-dl-border p-4 bg-gray-50">
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Hard Costs Only</p>
          <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(baseline)}</p>
          <p className="font-dl-mono text-xs text-dl-muted">{fmt(aggressive)} – {fmt(conservative)}</p>
        </div>
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Grand Total (Planning)</p>
          <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(grandBaseline)}</p>
          <p className="font-dl-mono text-xs text-dl-muted">{fmt(grandAggressive)} – {fmt(grandConservative)}</p>
        </div>
        {rehabArvPct !== null && (
          <div>
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Rehab / ARV</p>
            <p className={`font-dl-mono text-sm font-bold ${parseFloat(rehabArvPct) > 35 ? 'text-red-600' : parseFloat(rehabArvPct) > 25 ? 'text-yellow-700' : 'text-dl-forest'}`}>
              {rehabArvPct}%
            </p>
            <p className="font-dl-mono text-xs text-dl-muted">ARV: {fmt(estimate.arvEstimate!)}</p>
          </div>
        )}
      </div>

      <div className="border border-dl-border p-4">
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Underwriting Thresholds</p>
        <div className="space-y-2">
          {[
            { label: 'Target: Rehab/ARV < 25%', pass: rehabArvPct !== null && parseFloat(rehabArvPct) < 25 },
            { label: 'Target: Per-Unit Cost < $15,000', pass: estimate.perUnitCost < 15000 },
            { label: 'Target: Confidence ≥ 75%', pass: estimate.confidence >= 0.75 },
            { label: 'Coverage: Estimate Range < 50% spread', pass: (max - min) / grandBaseline < 0.50 },
          ].map(({ label, pass }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`font-dl-mono text-xs ${pass ? 'text-dl-forest' : 'text-dl-muted'}`}>
                {pass ? '✓' : '○'}
              </span>
              <span className={`font-dl-mono text-xs ${pass ? 'text-dl-text' : 'text-dl-muted'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-dl-border p-3 bg-gray-50">
        <p className="font-dl-mono text-xs text-dl-muted">
          Range method: Craftsman NCE {estimate.version > 0 ? `v${estimate.version}` : ''} mid-point costs
          × regional factor ({estimate.regionCode}) + contingency ({Math.round(estimate.contingencyPct * 100)}%)
          + soft costs ({Math.round(estimate.softCostPct * 100)}%).
          Confidence: {Math.round(estimate.confidence * 100)}%.
          Generated: {estimate.generatedAt ? new Date(estimate.generatedAt).toLocaleString() : '—'}.
        </p>
      </div>
    </div>
  );
}

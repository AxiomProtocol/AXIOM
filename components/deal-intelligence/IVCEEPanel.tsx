import { useState } from 'react';

interface IVCEEPanelProps {
  dealId: string;
  scenarioId: string;
}

type IVCEETab = 'probability' | 'sensitivity' | 'stress' | 'refinance' | 'downside' | 'efficiency';

const IVCEE_TABS: Array<{ key: IVCEETab; label: string }> = [
  { key: 'probability', label: 'Probability' },
  { key: 'stress', label: 'Stress Tests' },
  { key: 'sensitivity', label: 'Sensitivity' },
  { key: 'refinance', label: 'Refinance Risk' },
  { key: 'downside', label: 'Downside' },
  { key: 'efficiency', label: 'Capital Efficiency' },
];

function statusColor(viability: number): string {
  if (viability >= 0.70) return 'text-green-700 bg-green-50 border-green-300';
  if (viability >= 0.55) return 'text-yellow-700 bg-yellow-50 border-yellow-300';
  return 'text-red-700 bg-red-50 border-red-300';
}

function survivalColor(status: string): string {
  return status === 'SURVIVE'
    ? 'text-green-700 bg-green-50 border-green-300'
    : 'text-red-700 bg-red-50 border-red-300';
}

export default function IVCEEPanel({ dealId, scenarioId }: IVCEEPanelProps) {
  const [activeTab, setActiveTab] = useState<IVCEETab>('probability');
  const [results, setResults] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [computedAt, setComputedAt] = useState('');

  const runAnalysis = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/ivcee/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, scenarioId }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResults(json.data);
        setComputedAt(json.meta?.computedAt || new Date().toISOString());
      }
    } catch (err: any) {
      setError(err.message || 'IVCEE analysis failed');
    } finally {
      setRunning(false);
    }
  };

  const prob = results?.probability;
  const stress = results?.stressTests;
  const sensitivity = results?.sensitivity;
  const refi = results?.refinanceRisk;
  const downside = results?.downside;
  const efficiency = results?.capitalEfficiency;

  const topSensitivityRows = sensitivity
    ? [...sensitivity].sort((a: any, b: any) => Math.abs(b.viabilityShift) - Math.abs(a.viabilityShift)).slice(0, 20)
    : [];

  return (
    <div className="border border-dl-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy">IVCEE Analysis</h2>
          <p className="font-dl-mono text-xs text-dl-muted">Institutional Viability & Capital Efficiency Engine</p>
        </div>
        <div className="flex items-center gap-3">
          {computedAt && (
            <span className="font-dl-mono text-xs text-dl-muted">
              Computed: {new Date(computedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={running}
            className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
          >
            {running ? 'Computing...' : results ? 'Recompute IVCEE' : 'Run IVCEE Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-3 mb-4">
          <p className="text-red-700 font-dl-mono text-sm">{error}</p>
        </div>
      )}

      {!results && !running && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-muted mb-2">No IVCEE analysis computed yet.</p>
          <p className="font-dl-mono text-xs text-dl-muted">Run the analysis to compute viability probability, stress tests, sensitivity matrix, refinance risk, downside protection, and capital efficiency.</p>
        </div>
      )}

      {running && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-muted">Computing institutional viability metrics...</p>
          <p className="font-dl-mono text-xs text-dl-muted mt-1">Running 6 deterministic modules across all scenarios.</p>
        </div>
      )}

      {results && !running && (
        <>
          {prob && (
            <div className={`border p-4 mb-4 ${statusColor(prob.viabilityProbability)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-dl-mono text-xs uppercase block mb-1">Viability Probability</span>
                  <span className="font-dl-mono text-2xl font-bold">{(prob.viabilityProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="font-dl-mono text-xs uppercase block mb-1">Failure Probability</span>
                  <span className="font-dl-mono text-2xl font-bold">{(prob.failureProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="font-dl-mono text-xs uppercase block mb-1">Dominant Risk</span>
                  <span className="font-dl-mono text-sm font-bold">{prob.dominantRiskFactor?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex border-b border-dl-border mb-4 overflow-x-auto">
            {IVCEE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 font-dl-mono text-xs border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-dl-navy text-dl-navy'
                    : 'border-transparent text-dl-muted hover:text-dl-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'probability' && prob && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox label="Viability Score" value={prob.baseViabilityScore.toFixed(4)} />
                <MetricBox label="Viability Probability" value={`${(prob.viabilityProbability * 100).toFixed(1)}%`} />
                <MetricBox label="Failure Probability" value={`${(prob.failureProbability * 100).toFixed(1)}%`} />
                <MetricBox label="Dominant Risk Factor" value={prob.dominantRiskFactor?.replace(/_/g, ' ')} />
              </div>
              <div className="border border-dl-border p-3">
                <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Model Weights</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="font-dl-mono text-xs"><span className="text-dl-muted">DSCR: </span>40%</div>
                  <div className="font-dl-mono text-xs"><span className="text-dl-muted">Cash Flow: </span>25%</div>
                  <div className="font-dl-mono text-xs"><span className="text-dl-muted">Cap Rate: </span>20%</div>
                  <div className="font-dl-mono text-xs"><span className="text-dl-muted">Confidence: </span>15%</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stress' && stress && (
            <div className="overflow-x-auto">
              <table className="w-full font-dl-mono text-sm">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left py-2 text-xs text-dl-muted uppercase">Scenario</th>
                    <th className="text-right py-2 text-xs text-dl-muted uppercase">DSCR Stressed</th>
                    <th className="text-right py-2 text-xs text-dl-muted uppercase">Cashflow Stressed</th>
                    <th className="text-right py-2 text-xs text-dl-muted uppercase">Drawdown</th>
                    <th className="text-center py-2 text-xs text-dl-muted uppercase">Survival</th>
                  </tr>
                </thead>
                <tbody>
                  {stress.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-dl-border">
                      <td className="py-2 text-dl-text">{s.scenarioType.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right text-dl-text">{s.dscrStressed.toFixed(2)}</td>
                      <td className="py-2 text-right text-dl-text">${s.cashflowStressed.toLocaleString()}</td>
                      <td className="py-2 text-right text-dl-text">{(s.drawdownProjection * 100).toFixed(1)}%</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold ${survivalColor(s.survivalStatus)}`}>
                          {s.survivalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sensitivity' && (
            <div>
              <p className="font-dl-mono text-xs text-dl-muted mb-3">
                Top {topSensitivityRows.length} scenarios by viability impact (of {sensitivity?.length || 0} total combinations)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full font-dl-mono text-xs">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-right py-2 text-dl-muted uppercase">Price</th>
                      <th className="text-right py-2 text-dl-muted uppercase">Rent</th>
                      <th className="text-right py-2 text-dl-muted uppercase">Rate</th>
                      <th className="text-right py-2 text-dl-muted uppercase">DSCR</th>
                      <th className="text-right py-2 text-dl-muted uppercase">Cashflow</th>
                      <th className="text-right py-2 text-dl-muted uppercase">Viability Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSensitivityRows.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-dl-border">
                        <td className="py-1.5 text-right">{(r.priceDelta * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right">{(r.rentDelta * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right">{(r.rateDelta * 100).toFixed(1)}%</td>
                        <td className="py-1.5 text-right">{r.dscrOutput.toFixed(2)}</td>
                        <td className="py-1.5 text-right">${r.cashflowOutput.toLocaleString()}</td>
                        <td className={`py-1.5 text-right font-bold ${r.viabilityShift > 0 ? 'text-green-700' : r.viabilityShift < 0 ? 'text-red-700' : 'text-dl-muted'}`}>
                          {r.viabilityShift > 0 ? '+' : ''}{(r.viabilityShift * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'refinance' && refi && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox label="Refinance LTV" value={`${(refi.refinanceLtv * 100).toFixed(0)}%`} />
                <MetricBox label="Refinance DSCR" value={refi.refinanceDscr.toFixed(2)} />
                <MetricBox label="Equity Extracted" value={`$${refi.equityExtracted.toLocaleString()}`} />
                <MetricBox label="Refinance Probability" value={`${(refi.refinanceProbability * 100).toFixed(0)}%`} />
              </div>
              <div className={`border p-3 ${refi.failureConditions === 'NONE' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <span className="font-dl-mono text-xs text-dl-muted uppercase block mb-1">Failure Conditions</span>
                <p className="font-dl-mono text-sm">{refi.failureConditions}</p>
              </div>
            </div>
          )}

          {activeTab === 'downside' && downside && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricBox label="Break-Even Rent" value={`$${downside.breakEvenRent.toLocaleString()}/mo`} />
              <MetricBox label="Break-Even Price" value={`$${downside.breakEvenPrice.toLocaleString()}`} />
              <MetricBox label="Max Safe LTV" value={`${(downside.maxSafeLtv * 100).toFixed(1)}%`} />
              <div className={`border p-3 ${downside.marginOfSafety >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <span className="font-dl-mono text-xs text-dl-muted uppercase block mb-1">Margin of Safety</span>
                <span className={`font-dl-mono text-xl font-bold ${downside.marginOfSafety >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${downside.marginOfSafety.toLocaleString()}/mo
                </span>
              </div>
            </div>
          )}

          {activeTab === 'efficiency' && efficiency && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox label="ROI (Adjusted)" value={`${(efficiency.roiAdjusted * 100).toFixed(2)}%`} />
                <MetricBox label="Volatility Penalty" value={`${(efficiency.volatilityPenalty * 100).toFixed(1)}%`} />
                <MetricBox label="Leverage Penalty" value={`${(efficiency.leveragePenalty * 100).toFixed(1)}%`} />
                <MetricBox label="Efficiency Score" value={efficiency.efficiencyScore.toFixed(4)} />
              </div>
              {efficiency.capitalRank && (
                <div className="border border-dl-navy p-3">
                  <span className="font-dl-mono text-xs text-dl-muted uppercase block mb-1">Capital Rank</span>
                  <span className="font-dl-mono text-2xl font-bold text-dl-navy">#{efficiency.capitalRank}</span>
                  <span className="font-dl-mono text-xs text-dl-muted ml-2">across all analyzed deals</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-dl-border p-3">
      <span className="font-dl-mono text-xs text-dl-muted uppercase block mb-1">{label}</span>
      <span className="font-dl-mono text-lg font-bold text-dl-navy">{value}</span>
    </div>
  );
}

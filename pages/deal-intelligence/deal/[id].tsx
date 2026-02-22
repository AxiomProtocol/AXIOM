import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';

interface DealSummary {
  deal: Record<string, any>;
  property: Record<string, any> | null;
  scenarios: Array<{
    scenario: Record<string, any>;
    assumptions: Record<string, any> | null;
    metrics: Record<string, any> | null;
    riskFlags: Array<Record<string, any>>;
  }>;
  comparables: Array<Record<string, any>>;
  decisions: { total: number; recent: Array<Record<string, any>> };
}

const DEFAULT_ASSUMPTIONS = {
  purchasePrice: '200000',
  arvEstimate: '280000',
  rehabBudget: '40000',
  downPaymentPct: '20',
  interestRate: '7.5',
  loanTermYears: '30',
  closingCostPct: '3',
  monthlyRent: '1800',
  vacancyPct: '8',
  propertyMgmtPct: '10',
  annualInsurance: '1800',
  annualTaxes: '3600',
  annualCapex: '2000',
  annualMaintenance: '2000',
  holdPeriodMonths: '6',
  appreciationPct: '3',
};

type AssumptionsState = typeof DEFAULT_ASSUMPTIONS;

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-50 border-green-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
};

export default function DealWorkspacePage() {
  const router = useRouter();
  const { id } = router.query;

  const [summary, setSummary] = useState<DealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'assumptions' | 'metrics' | 'risks' | 'decisions'>('assumptions');
  const [assumptions, setAssumptions] = useState<AssumptionsState>(DEFAULT_ASSUMPTIONS);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [newDecision, setNewDecision] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/summary`);
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setSummary(json.data);
        let scenarios = json.data?.scenarios || [];

        if (scenarios.length === 0) {
          const createRes = await fetch(`/api/real-estate/deals/${id}/scenarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioName: 'Base Case' }),
          });
          const createJson = await createRes.json();
          if (createJson.data?.scenario?.id) {
            const newScenarioId = createJson.data.scenario.id;
            await fetch(`/api/real-estate/deals/${id}/assumptions`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenarioId: newScenarioId, ...DEFAULT_ASSUMPTIONS }),
            });
            const refreshRes = await fetch(`/api/real-estate/deals/${id}/summary`);
            const refreshJson = await refreshRes.json();
            if (!refreshJson.error) {
              setSummary(refreshJson.data);
              scenarios = refreshJson.data?.scenarios || [];
            }
          }
        }

        if (scenarios.length > 0) {
          setActiveScenarioId(scenarios[0].scenario.id);
          if (scenarios[0].assumptions) {
            const a = scenarios[0].assumptions;
            setAssumptions({
              purchasePrice: a.purchasePrice || DEFAULT_ASSUMPTIONS.purchasePrice,
              arvEstimate: a.arvEstimate || DEFAULT_ASSUMPTIONS.arvEstimate,
              rehabBudget: a.rehabBudget || DEFAULT_ASSUMPTIONS.rehabBudget,
              downPaymentPct: a.downPaymentPct || DEFAULT_ASSUMPTIONS.downPaymentPct,
              interestRate: a.interestRate || DEFAULT_ASSUMPTIONS.interestRate,
              loanTermYears: a.loanTermYears || DEFAULT_ASSUMPTIONS.loanTermYears,
              closingCostPct: a.closingCostPct || DEFAULT_ASSUMPTIONS.closingCostPct,
              monthlyRent: a.monthlyRent || DEFAULT_ASSUMPTIONS.monthlyRent,
              vacancyPct: a.vacancyPct || DEFAULT_ASSUMPTIONS.vacancyPct,
              propertyMgmtPct: a.propertyMgmtPct || DEFAULT_ASSUMPTIONS.propertyMgmtPct,
              annualInsurance: a.annualInsurance || DEFAULT_ASSUMPTIONS.annualInsurance,
              annualTaxes: a.annualTaxes || DEFAULT_ASSUMPTIONS.annualTaxes,
              annualCapex: a.annualCapex || DEFAULT_ASSUMPTIONS.annualCapex,
              annualMaintenance: a.annualMaintenance || DEFAULT_ASSUMPTIONS.annualMaintenance,
              holdPeriodMonths: a.holdPeriodMonths || DEFAULT_ASSUMPTIONS.holdPeriodMonths,
              appreciationPct: a.appreciationPct || DEFAULT_ASSUMPTIONS.appreciationPct,
            });
          }
        }
      }
    } catch {
      setError('Failed to load deal summary');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleCreateScenario = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioName: 'Base Case' }),
      });
      const json = await res.json();
      if (json.data?.scenario?.id) {
        setActiveScenarioId(json.data.scenario.id);
        await loadSummary();
      }
    } catch {
      setError('Failed to create scenario');
    }
  }, [id, loadSummary]);

  const handleSaveAssumptions = useCallback(async () => {
    if (!id || !activeScenarioId) return;
    setSaving(true);
    try {
      await fetch(`/api/real-estate/deals/${id}/assumptions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: activeScenarioId, ...assumptions }),
      });
      await loadSummary();
    } catch {
      setError('Failed to save assumptions');
    } finally {
      setSaving(false);
    }
  }, [id, activeScenarioId, assumptions, loadSummary]);

  const handleRecompute = useCallback(async () => {
    if (!id || !activeScenarioId) return;
    setComputing(true);
    try {
      await handleSaveAssumptions();
      const res = await fetch(`/api/real-estate/deals/${id}/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: activeScenarioId }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setActiveTab('metrics');
        await loadSummary();
      }
    } catch {
      setError('Failed to recompute metrics');
    } finally {
      setComputing(false);
    }
  }, [id, activeScenarioId, handleSaveAssumptions, loadSummary]);

  const handleAddDecision = useCallback(async () => {
    if (!id || !newDecision.trim()) return;
    setSubmittingDecision(true);
    try {
      const currentMetrics = summary?.scenarios?.find(s => s.scenario.id === activeScenarioId)?.metrics;
      await fetch(`/api/real-estate/deals/${id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: newDecision.trim(),
          decidedBy: 'operator',
          rationale: newRationale.trim() || null,
          snapshotMetrics: currentMetrics ? {
            noi: currentMetrics.noi,
            capRate: currentMetrics.capRate,
            cashOnCash: currentMetrics.cashOnCash,
            dscr: currentMetrics.dscr,
          } : null,
        }),
      });
      setNewDecision('');
      setNewRationale('');
      await loadSummary();
    } catch {
      setError('Failed to record decision');
    } finally {
      setSubmittingDecision(false);
    }
  }, [id, newDecision, newRationale, activeScenarioId, summary, loadSummary]);

  const handleField = (field: keyof AssumptionsState, value: string) => {
    setAssumptions(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-dl-muted font-dl-mono text-sm">Loading deal workspace...</p>
        </div>
      </DesignLawLayout>
    );
  }

  if (error && !summary) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="border border-red-300 bg-red-50 p-4">
            <p className="text-red-700 font-dl-mono text-sm">{error}</p>
          </div>
        </div>
      </DesignLawLayout>
    );
  }

  const deal = summary?.deal;
  const property = summary?.property;
  const currentScenario = summary?.scenarios?.find(s => s.scenario.id === activeScenarioId);
  const metrics = currentScenario?.metrics;
  const riskFlags = currentScenario?.riskFlags || [];

  const TABS = [
    { key: 'assumptions' as const, label: 'Assumptions' },
    { key: 'metrics' as const, label: 'Metrics' },
    { key: 'risks' as const, label: `Risks (${riskFlags.length})` },
    { key: 'decisions' as const, label: 'Decision Log' },
  ];

  const inputField = (label: string, field: keyof AssumptionsState, prefix = '', suffix = '') => (
    <div>
      <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">{label}</label>
      <div className="flex items-center border border-dl-border">
        {prefix && <span className="px-2 font-dl-mono text-sm text-dl-muted bg-dl-bg border-r border-dl-border">{prefix}</span>}
        <input
          type="text"
          value={assumptions[field]}
          onChange={(e) => handleField(field, e.target.value)}
          className="flex-1 px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
        />
        {suffix && <span className="px-2 font-dl-mono text-sm text-dl-muted bg-dl-bg border-l border-dl-border">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <DesignLawLayout>
      <Head>
        <title>{deal?.dealName || 'Deal'} | Deal Intelligence | AXIOM</title>
      </Head>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/deal-intelligence" className="text-dl-navy font-dl-mono text-sm underline hover:no-underline">
            Back to Search
          </Link>
          {property && (
            <Link href={`/deal-intelligence/property/${property.id}`} className="text-dl-navy font-dl-mono text-sm underline hover:no-underline">
              View Property
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h1 className="font-dl-serif text-2xl text-dl-navy">{deal?.dealName || 'Deal Workspace'}</h1>
          <span className="font-dl-mono text-xs text-dl-muted border border-dl-border px-2 py-1 uppercase">{deal?.status}</span>
        </div>
        <p className="text-dl-muted font-dl-mono text-sm mb-6">
          Strategy: {deal?.strategy?.toUpperCase()} | {property?.addressRaw || 'Unknown property'}
        </p>

        {error && (
          <div className="border border-red-300 bg-red-50 p-3 mb-4">
            <p className="text-red-700 font-dl-mono text-sm">{error}</p>
          </div>
        )}

        {(!summary?.scenarios || summary.scenarios.length === 0) && (
          <div className="border border-dl-border p-6 text-center mb-6">
            <p className="text-dl-muted font-dl-mono text-sm mb-3">No scenarios yet. Create one to start underwriting.</p>
            <button onClick={handleCreateScenario} className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm">
              Create Base Case Scenario
            </button>
          </div>
        )}

        {activeScenarioId && (
          <>
            <div className="flex border-b border-dl-border mb-6">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 font-dl-mono text-sm border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-dl-navy text-dl-navy'
                      : 'border-transparent text-dl-muted hover:text-dl-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'assumptions' && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-dl-serif text-lg text-dl-navy">Financial Assumptions</h2>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAssumptions} disabled={saving} className="border border-dl-navy text-dl-navy px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleRecompute} disabled={computing} className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50">
                      {computing ? 'Computing...' : 'Run Underwriting'}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Acquisition</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {inputField('Purchase Price', 'purchasePrice', '$')}
                    {inputField('ARV Estimate', 'arvEstimate', '$')}
                    {inputField('Rehab Budget', 'rehabBudget', '$')}
                    {inputField('Closing Cost', 'closingCostPct', '', '%')}
                    {inputField('Hold Period', 'holdPeriodMonths', '', 'mo')}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Financing</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {inputField('Down Payment', 'downPaymentPct', '', '%')}
                    {inputField('Interest Rate', 'interestRate', '', '%')}
                    {inputField('Loan Term', 'loanTermYears', '', 'yr')}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Income</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {inputField('Monthly Rent', 'monthlyRent', '$')}
                    {inputField('Vacancy', 'vacancyPct', '', '%')}
                  </div>
                </div>

                <div>
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Expenses</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {inputField('Management', 'propertyMgmtPct', '', '%')}
                    {inputField('Maintenance/yr', 'annualMaintenance', '$')}
                    {inputField('Insurance/yr', 'annualInsurance', '$')}
                    {inputField('Taxes/yr', 'annualTaxes', '$')}
                    {inputField('CapEx/yr', 'annualCapex', '$')}
                    {inputField('Appreciation', 'appreciationPct', '', '%')}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="border border-dl-border p-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Underwriting Metrics</h2>
                {!metrics ? (
                  <p className="text-dl-muted font-dl-mono text-sm">No metrics computed yet. Save assumptions and run underwriting first.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: 'NOI (Annual)', value: `$${Number(metrics.noi).toLocaleString()}` },
                        { label: 'Cap Rate', value: `${Number(metrics.capRate).toFixed(2)}%` },
                        { label: 'Cash-on-Cash', value: `${Number(metrics.cashOnCash).toFixed(2)}%` },
                        { label: 'DSCR', value: Number(metrics.dscr).toFixed(2) },
                        { label: 'Monthly Cash Flow', value: `$${Number(metrics.monthlyCashFlow).toLocaleString()}` },
                        { label: 'Annual Cash Flow', value: `$${Number(metrics.annualCashFlow).toLocaleString()}` },
                        { label: 'Break-Even', value: metrics.breakEvenMonths ? `${metrics.breakEvenMonths} mo` : 'N/A' },
                        { label: 'Rehab ROI', value: `${Number(metrics.rehabRoi).toFixed(2)}%` },
                        { label: 'Rent-to-Value', value: `${Number(metrics.rentToValue).toFixed(2)}%` },
                        { label: 'GRM', value: Number(metrics.grm).toFixed(2) },
                      ].map(item => (
                        <div key={item.label} className="border border-dl-border p-3">
                          <span className="block text-xs font-dl-mono text-dl-muted uppercase">{item.label}</span>
                          <span className="block font-dl-mono text-lg text-dl-navy">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    {metrics.meta && typeof metrics.meta === 'object' && (metrics.meta as any).strategySpecific && Object.keys((metrics.meta as any).strategySpecific).length > 0 && (
                      <div>
                        <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Strategy-Specific</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries((metrics.meta as any).strategySpecific).map(([key, value]) => (
                            <div key={key} className="border border-dl-border p-3">
                              <span className="block text-xs font-dl-mono text-dl-muted uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="block font-dl-mono text-sm text-dl-navy">
                                {typeof value === 'number' ? (value > 1000 ? `$${value.toLocaleString()}` : value.toFixed(2)) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="border border-dl-border p-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Risk Flags</h2>
                {riskFlags.length === 0 ? (
                  <p className="text-dl-muted font-dl-mono text-sm">No risk flags. Run underwriting to generate risk assessment.</p>
                ) : (
                  <div className="space-y-3">
                    {riskFlags.map((flag: any, i: number) => (
                      <div key={flag.id || i} className={`border p-3 ${SEVERITY_COLORS[flag.severity] || ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-dl-mono text-xs uppercase font-bold">{flag.severity}</span>
                          <span className="font-dl-mono text-xs text-dl-muted">{flag.flagType}</span>
                        </div>
                        <p className="font-dl-mono text-sm">{flag.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="border border-dl-border p-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Decision Log</h2>

                <div className="border border-dl-border p-4 mb-6 bg-gray-50">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Record Decision</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Decision</label>
                      <select
                        value={newDecision}
                        onChange={(e) => setNewDecision(e.target.value)}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                      >
                        <option value="">Select decision...</option>
                        <option value="PROCEED">PROCEED — Move forward with deal</option>
                        <option value="HOLD">HOLD — Need more information</option>
                        <option value="RENEGOTIATE">RENEGOTIATE — Adjust terms</option>
                        <option value="REJECT">REJECT — Pass on deal</option>
                        <option value="APPROVE">APPROVE — Final approval</option>
                        <option value="NOTE">NOTE — General observation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Rationale</label>
                      <input
                        type="text"
                        value={newRationale}
                        onChange={(e) => setNewRationale(e.target.value)}
                        placeholder="Reasoning for this decision..."
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddDecision}
                    disabled={!newDecision || submittingDecision}
                    className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                  >
                    {submittingDecision ? 'Recording...' : 'Record Decision'}
                  </button>
                </div>

                {summary?.decisions?.total ? (
                  <p className="font-dl-mono text-xs text-dl-muted mb-3">{summary.decisions.total} total entries</p>
                ) : null}

                {(!summary?.decisions?.recent || summary.decisions.recent.length === 0) ? (
                  <p className="text-dl-muted font-dl-mono text-sm">No decisions recorded yet. Run underwriting or record a decision above.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.decisions.recent.map((entry: any) => {
                      const decisionColors: Record<string, string> = {
                        APPROVE: 'border-l-4 border-l-green-600',
                        PROCEED: 'border-l-4 border-l-green-500',
                        HOLD: 'border-l-4 border-l-yellow-500',
                        RENEGOTIATE: 'border-l-4 border-l-orange-500',
                        REJECT: 'border-l-4 border-l-red-500',
                        UNDERWRITING_COMPUTED: 'border-l-4 border-l-blue-500',
                        NOTE: 'border-l-4 border-l-gray-400',
                      };
                      const colorClass = decisionColors[entry.decision] || 'border-l-4 border-l-gray-300';
                      return (
                        <div key={entry.id} className={`border border-dl-border p-3 ${colorClass}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-dl-mono text-sm font-bold text-dl-navy">{entry.decision}</span>
                            <span className="font-dl-mono text-xs text-dl-muted">
                              {entry.decidedAt ? new Date(entry.decidedAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="font-dl-mono text-sm text-dl-muted">{entry.rationale || '-'}</p>
                          <span className="font-dl-mono text-xs text-dl-muted">by {entry.decidedBy}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}

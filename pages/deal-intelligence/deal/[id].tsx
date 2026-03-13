import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import IVCEEPanel from '../../../components/deal-intelligence/IVCEEPanel';
import DocumentsPanel from '../../../components/deal-intelligence/DocumentsPanel';
import DueDiligencePanel from '../../../components/deal-intelligence/DueDiligencePanel';
import CapitalReadinessCard from '../../../components/deal-intelligence/CapitalReadinessCard';
import StrategyComparison from '../../../components/deal-intelligence/StrategyComparison';
import AcquisitionMemo from '../../../components/deal-intelligence/AcquisitionMemo';

const STRATEGY_OPTIONS = [
  { key: 'brrrr', label: 'BRRRR', icon: '/images/realestate/icon_brrrr.png' },
  { key: 'flip', label: 'Flip', icon: '/images/realestate/icon_flip.png' },
  { key: 'hold', label: 'Buy & Hold', icon: '/images/realestate/icon_hold.png' },
];

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
  const [activeTab, setActiveTab] = useState<'assumptions' | 'metrics' | 'risks' | 'comps' | 'analysis' | 'decisions' | 'ivcee' | 'documents' | 'dueDiligence' | 'strategies' | 'memo'>('assumptions');
  const [assumptions, setAssumptions] = useState<AssumptionsState>(DEFAULT_ASSUMPTIONS);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [newDecision, setNewDecision] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzingDeal, setAnalyzingDeal] = useState(false);
  const [comps, setComps] = useState<any[]>([]);
  const [avm, setAvm] = useState<any>(null);
  const [fetchingComps, setFetchingComps] = useState(false);
  const [compsLoaded, setCompsLoaded] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [analysisSavedAt, setAnalysisSavedAt] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

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

  const handleAiAnalysis = useCallback(async () => {
    if (!id || !activeScenarioId) return;
    setAnalyzingDeal(true);
    setAiAnalysis(null);
    setError('');
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: activeScenarioId }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const status = res.status;
        if (status === 504 || status === 502) {
          setError(`Analysis timed out (${status}). The AI model needs more time. Please try again.`);
        } else {
          setError(`Server returned non-JSON response (HTTP ${status}). Please try again.`);
        }
        return;
      }
      const json = await res.json();
      if (json.error) {
        setError(json.error.message || 'Analysis failed');
      } else {
        setAiAnalysis(json.data.analysis);
        await loadSummary();
      }
    } catch (err: any) {
      setError(`AI analysis failed: ${err.message || 'Network error. Check your connection and try again.'}`);
    } finally {
      setAnalyzingDeal(false);
    }
  }, [id, activeScenarioId, loadSummary]);

  const handleSaveAnalysis = useCallback(async () => {
    if (!id || !activeScenarioId || !aiAnalysis) return;
    setSavingAnalysis(true);
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/saved-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: activeScenarioId, analysis: aiAnalysis }),
      });
      const json = await res.json();
      if (json.data?.saved) {
        setAnalysisSavedAt(json.data.savedAt);
      }
    } catch {}
    setSavingAnalysis(false);
  }, [id, activeScenarioId, aiAnalysis]);

  const loadSavedAnalysis = useCallback(async () => {
    if (!id || !activeScenarioId) return;
    setLoadingAnalysis(true);
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/saved-analysis?scenarioId=${activeScenarioId}`);
      const json = await res.json();
      if (json.data?.analysis) {
        setAiAnalysis(json.data.analysis);
        setAnalysisSavedAt(json.data.savedAt);
      }
    } catch {}
    setLoadingAnalysis(false);
  }, [id, activeScenarioId]);

  useEffect(() => {
    if (id && activeScenarioId && !aiAnalysis) {
      loadSavedAnalysis();
    }
  }, [id, activeScenarioId, aiAnalysis, loadSavedAnalysis]);

  const loadComps = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/comps`);
      const json = await res.json();
      if (!json.error) {
        setComps(json.data.comps || []);
        setAvm(json.data.avm || null);
        setCompsLoaded(true);
      }
    } catch {}
  }, [id]);

  const handleFetchComps = useCallback(async () => {
    if (!id) return;
    setFetchingComps(true);
    setError('');
    try {
      const res = await fetch(`/api/real-estate/deals/${id}/comps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compCount: 15 }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setComps(json.data.comps || []);
        setAvm(json.data.avm || null);
        setCompsLoaded(true);
      }
    } catch {
      setError('Failed to fetch comparable sales');
    } finally {
      setFetchingComps(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && !compsLoaded) {
      loadComps();
    }
  }, [id, compsLoaded, loadComps]);

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
    { key: 'comps' as const, label: `Comps (${comps.length})` },
    { key: 'strategies' as const, label: 'Strategy Comparison' },
    { key: 'analysis' as const, label: 'Acquisition Advisory' },
    { key: 'ivcee' as const, label: 'IVCEE' },
    { key: 'documents' as const, label: 'Documents' },
    { key: 'dueDiligence' as const, label: 'Due Diligence' },
    { key: 'memo' as const, label: 'Acquisition Memo' },
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h1 className="font-dl-serif text-xl sm:text-2xl text-dl-navy">{deal?.dealName || 'Deal Workspace'}</h1>
          <div className="flex items-center gap-3">
            {metrics && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/syndication/offerings/create-from-deal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dealId: id, offeringType: 'clubDeal' }),
                    });
                    const json = await res.json();
                    if (json.success && json.offeringId) {
                      router.push(`/syndication/offerings/${json.offeringId}`);
                    }
                  } catch (err) {
                    console.error('Failed to create offering', err);
                  }
                }}
                className="bg-dl-forest text-white px-4 py-2 min-h-[44px] font-dl-mono text-xs"
              >
                Create Offering
              </button>
            )}
            <span className="font-dl-mono text-xs text-dl-muted border border-dl-border px-2 py-1 uppercase">{deal?.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-dl-muted font-dl-mono text-sm">
            Strategy: {deal?.strategy?.toUpperCase()} | {property?.addressRaw || 'Unknown property'}
          </p>
        </div>
        <div className="flex items-center gap-1 mb-6">
          {['Research', 'Underwriting', 'Offering Structuring', 'Capital Formation', 'Funded'].map((stage, i) => {
            const stageMap: Record<string, number> = { sourced: 0, analyzing: 1, underwriting: 1, offering: 2, raising: 3, funded: 4, closed: 4 };
            const current = stageMap[deal?.status || ''] ?? 0;
            const isActive = i <= current;
            const isCurrent = i === current;
            return (
              <span key={stage} className={`px-1.5 py-0.5 text-[10px] font-dl-mono ${isCurrent ? 'bg-dl-navy text-white' : isActive ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                {stage}
              </span>
            );
          })}
        </div>

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
            <div className="flex border-b border-dl-border mb-6 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 sm:px-4 py-2 min-h-[44px] font-dl-mono text-xs sm:text-sm border-b-2 -mb-px whitespace-nowrap ${
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="font-dl-serif text-lg text-dl-navy">Financial Assumptions</h2>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAssumptions} disabled={saving} className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleRecompute} disabled={computing} className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50">
                      {computing ? 'Computing...' : 'Run Underwriting'}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Strategy</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {STRATEGY_OPTIONS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={async () => {
                          if (!id || deal?.strategy === s.key) return;
                          try {
                            await fetch(`/api/real-estate/deals/${id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ strategy: s.key }),
                            });
                            await loadSummary();
                          } catch {}
                        }}
                        className={`flex flex-col items-center p-3 border min-h-[44px] ${
                          deal?.strategy === s.key
                            ? 'border-dl-navy bg-blue-50'
                            : 'border-dl-border hover:border-dl-navy'
                        }`}
                      >
                        <div className="relative w-8 h-8 mb-1">
                          <Image src={s.icon} alt="" fill className="object-contain" />
                        </div>
                        <span className="font-dl-mono text-xs text-dl-navy">{s.label}</span>
                      </button>
                    ))}
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
                <CapitalReadinessCard
                  assumptions={assumptions}
                  metrics={metrics || null}
                  dealId={id as string}
                />
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

            {activeTab === 'comps' && (
              <div className="border border-dl-border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="font-dl-serif text-lg text-dl-navy">Comparable Sales</h2>
                  <button
                    onClick={handleFetchComps}
                    disabled={fetchingComps}
                    className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
                  >
                    {fetchingComps ? 'Fetching...' : comps.length > 0 ? 'Refresh Comps' : 'Fetch Comps'}
                  </button>
                </div>

                {fetchingComps && (
                  <div className="border border-dl-border p-6 text-center">
                    <p className="font-dl-mono text-sm text-dl-muted">Searching for comparable sales near this property...</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-2">This typically takes 5-10 seconds.</p>
                  </div>
                )}

                {avm && (
                  <div className="border border-dl-navy bg-blue-50 p-4 mb-4">
                    <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-2 font-bold">Automated Valuation Model (AVM)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="font-dl-mono text-xs text-dl-muted block">Estimated Value</span>
                        <span className="font-dl-mono text-lg font-bold text-dl-navy">${(avm.value || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-dl-mono text-xs text-dl-muted block">Range Low</span>
                        <span className="font-dl-mono text-sm text-dl-text">${(avm.rangeLow || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-dl-mono text-xs text-dl-muted block">Range High</span>
                        <span className="font-dl-mono text-sm text-dl-text">${(avm.rangeHigh || 0).toLocaleString()}</span>
                      </div>
                      {avm.pricePerSqft && (
                        <div>
                          <span className="font-dl-mono text-xs text-dl-muted block">Price/SqFt</span>
                          <span className="font-dl-mono text-sm text-dl-text">${avm.pricePerSqft.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {comps.length === 0 && !fetchingComps && (
                  <p className="text-dl-muted font-dl-mono text-sm">No comparable sales loaded. Click "Fetch Comps" to pull data from RentCast.</p>
                )}

                {comps.length > 0 && !fetchingComps && (
                  <div>
                    <p className="font-dl-mono text-xs text-dl-muted mb-3">{comps.length} comparable sales loaded</p>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full font-dl-mono text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left py-2 text-xs text-dl-muted uppercase pr-3">Address</th>
                            <th className="text-right py-2 text-xs text-dl-muted uppercase pr-3">Sale Price</th>
                            <th className="text-right py-2 text-xs text-dl-muted uppercase pr-3">$/SqFt</th>
                            <th className="text-right py-2 text-xs text-dl-muted uppercase pr-3">SqFt</th>
                            <th className="text-center py-2 text-xs text-dl-muted uppercase pr-3">Bed/Bath</th>
                            <th className="text-right py-2 text-xs text-dl-muted uppercase pr-3">Dist (mi)</th>
                            <th className="text-left py-2 text-xs text-dl-muted uppercase">Sale Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comps.map((c: any, i: number) => (
                            <tr key={c.id || i} className="border-b border-dl-border hover:bg-gray-50">
                              <td className="py-2 pr-3 text-dl-text text-xs">{c.address}</td>
                              <td className="py-2 pr-3 text-right text-dl-navy font-bold">${Number(c.sale_price || 0).toLocaleString()}</td>
                              <td className="py-2 pr-3 text-right">{c.price_per_sqft ? `$${Number(c.price_per_sqft).toFixed(0)}` : '-'}</td>
                              <td className="py-2 pr-3 text-right">{c.sqft ? Number(c.sqft).toLocaleString() : '-'}</td>
                              <td className="py-2 pr-3 text-center">{c.bedrooms || '-'}/{c.bathrooms || '-'}</td>
                              <td className="py-2 pr-3 text-right">{c.distance_miles ? Number(c.distance_miles).toFixed(1) : '-'}</td>
                              <td className="py-2 text-dl-muted text-xs">{c.sale_date ? new Date(c.sale_date).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden grid grid-cols-1 gap-3">
                      {comps.map((c: any, i: number) => (
                        <div key={c.id || i} className="border border-dl-border p-3">
                          <p className="font-dl-mono text-xs text-dl-text mb-2">{c.address}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                            <div><span className="text-dl-muted">Price: </span><span className="text-dl-navy font-bold">${Number(c.sale_price || 0).toLocaleString()}</span></div>
                            <div><span className="text-dl-muted">$/SqFt: </span><span>{c.price_per_sqft ? `$${Number(c.price_per_sqft).toFixed(0)}` : '-'}</span></div>
                            <div><span className="text-dl-muted">SqFt: </span><span>{c.sqft ? Number(c.sqft).toLocaleString() : '-'}</span></div>
                            <div><span className="text-dl-muted">Bed/Bath: </span><span>{c.bedrooms || '-'}/{c.bathrooms || '-'}</span></div>
                            <div><span className="text-dl-muted">Distance: </span><span>{c.distance_miles ? `${Number(c.distance_miles).toFixed(1)} mi` : '-'}</span></div>
                            <div><span className="text-dl-muted">Sold: </span><span>{c.sale_date ? new Date(c.sale_date).toLocaleDateString() : '-'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {comps.length >= 3 && (
                      <div className="mt-4 border border-dl-border p-3">
                        <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-2 font-bold">Comp Summary</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="font-dl-mono text-xs text-dl-muted block">Avg Sale Price</span>
                            <span className="font-dl-mono text-sm font-bold text-dl-navy">
                              ${Math.round(comps.reduce((sum: number, c: any) => sum + Number(c.sale_price || 0), 0) / comps.length).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-dl-mono text-xs text-dl-muted block">Avg $/SqFt</span>
                            <span className="font-dl-mono text-sm text-dl-text">
                              ${Math.round(comps.filter((c: any) => c.price_per_sqft).reduce((sum: number, c: any) => sum + Number(c.price_per_sqft), 0) / (comps.filter((c: any) => c.price_per_sqft).length || 1)).toFixed(0)}
                            </span>
                          </div>
                          <div>
                            <span className="font-dl-mono text-xs text-dl-muted block">Price Range</span>
                            <span className="font-dl-mono text-sm text-dl-text">
                              ${Math.min(...comps.map((c: any) => Number(c.sale_price || 0))).toLocaleString()} - ${Math.max(...comps.map((c: any) => Number(c.sale_price || 0))).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-dl-mono text-xs text-dl-muted block">Avg Distance</span>
                            <span className="font-dl-mono text-sm text-dl-text">
                              {(comps.filter((c: any) => c.distance_miles).reduce((sum: number, c: any) => sum + Number(c.distance_miles), 0) / (comps.filter((c: any) => c.distance_miles).length || 1)).toFixed(1)} mi
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'strategies' && id && (
              <StrategyComparison dealId={id as string} />
            )}

            {activeTab === 'analysis' && (
              <div className="border border-dl-border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-dl-serif text-lg text-dl-navy">Acquisition Advisory</h2>
                    {analysisSavedAt && (
                      <span className="font-dl-mono text-xs text-dl-muted">Last saved: {new Date(analysisSavedAt).toLocaleString()}</span>
                    )}
                    {loadingAnalysis && (
                      <span className="font-dl-mono text-xs text-dl-muted">Loading saved analysis...</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {aiAnalysis && !analyzingDeal && (
                      <button
                        onClick={handleSaveAnalysis}
                        disabled={savingAnalysis}
                        className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
                      >
                        {savingAnalysis ? 'Saving...' : 'Save Results'}
                      </button>
                    )}
                    <button
                      onClick={handleAiAnalysis}
                      disabled={analyzingDeal || !metrics}
                      className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
                    >
                      {analyzingDeal ? 'Analyzing...' : 'Run Acquisition Analysis'}
                    </button>
                  </div>
                </div>

                {!metrics && (
                  <p className="text-dl-muted font-dl-mono text-sm">Run underwriting first to generate metrics before requesting acquisition analysis.</p>
                )}

                {analyzingDeal && (
                  <div className="border border-dl-border p-6 text-center">
                    <p className="font-dl-mono text-sm text-dl-muted">AI acquisition advisor is analyzing your deal...</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-2">Calculating offer strategy, creative structures, and risk management plan.</p>
                  </div>
                )}

                {aiAnalysis && !analyzingDeal && (
                  <div className="space-y-5">
                    <div className={`border p-4 ${
                      aiAnalysis.verdict === 'STRONG_PROCEED' ? 'border-green-600 bg-green-50' :
                      aiAnalysis.verdict === 'PROCEED' ? 'border-green-400 bg-green-50' :
                      aiAnalysis.verdict === 'CONDITIONAL_PROCEED' ? 'border-yellow-500 bg-yellow-50' :
                      'border-red-600 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-dl-mono text-lg font-bold uppercase">{aiAnalysis.verdict?.replace(/_/g, ' ')}</span>
                        <span className="font-dl-mono text-sm text-dl-muted">Confidence: {((aiAnalysis.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <p className="font-dl-mono text-sm">{aiAnalysis.summary}</p>
                      {aiAnalysis.acquisitionRecommendation && (
                        <p className="font-dl-mono text-sm mt-2 font-bold text-dl-navy">{aiAnalysis.acquisitionRecommendation}</p>
                      )}
                      {(aiAnalysis.confidenceFactors || []).length > 0 && (
                        <div className="mt-2 border-t border-dl-border pt-2">
                          <span className="font-dl-mono text-xs text-dl-muted uppercase">Confidence factors: </span>
                          <span className="font-dl-mono text-xs text-dl-muted">{aiAnalysis.confidenceFactors.join(' | ')}</span>
                        </div>
                      )}
                    </div>

                    {aiAnalysis.offerStrategy && (
                      <div className="border border-dl-navy p-4">
                        <h3 className="font-dl-serif text-base text-dl-navy mb-3">Offer Strategy</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                          <div className="border border-dl-border p-3">
                            <span className="font-dl-mono text-xs text-dl-muted uppercase block">Max Offer Price</span>
                            <span className="font-dl-mono text-xl font-bold text-dl-navy">${(aiAnalysis.offerStrategy.maxOfferPrice || 0).toLocaleString()}</span>
                          </div>
                          <div className="border border-dl-border p-3">
                            <span className="font-dl-mono text-xs text-dl-muted uppercase block">Walk-Away Price</span>
                            <span className="font-dl-mono text-xl font-bold text-red-700">${(aiAnalysis.offerStrategy.walkAwayPrice || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="font-dl-mono text-sm text-dl-text mb-3">{aiAnalysis.offerStrategy.offerRationale}</p>
                        {aiAnalysis.offerStrategy.walkAwayRationale && (
                          <p className="font-dl-mono text-xs text-dl-muted mb-3">{aiAnalysis.offerStrategy.walkAwayRationale}</p>
                        )}
                        {(aiAnalysis.offerStrategy.negotiationPoints || []).length > 0 && (
                          <div>
                            <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-1 font-bold">Negotiation Leverage</h4>
                            <ul className="space-y-1">
                              {aiAnalysis.offerStrategy.negotiationPoints.map((p: string, i: number) => (
                                <li key={i} className="font-dl-mono text-sm text-dl-text flex items-start gap-2">
                                  <span className="text-dl-navy mt-0.5">&#8250;</span> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {(aiAnalysis.creativeStrategies || []).length > 0 && (
                      <div className="border border-dl-border p-4">
                        <h3 className="font-dl-serif text-base text-dl-navy mb-3">Creative Acquisition Strategies</h3>
                        <div className="space-y-3">
                          {aiAnalysis.creativeStrategies.map((s: any, i: number) => (
                            <div key={i} className="border border-dl-border p-3">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-dl-mono text-sm font-bold text-dl-navy">{s.name}</h4>
                                <span className={`font-dl-mono text-xs px-2 py-0.5 ${
                                  s.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                                  s.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{s.riskLevel}</span>
                              </div>
                              <p className="font-dl-mono text-sm text-dl-text mb-1">{s.description}</p>
                              <p className="font-dl-mono text-sm text-dl-navy font-bold">{s.projectedCashFlow}</p>
                              {(s.requirements || []).length > 0 && (
                                <div className="mt-2">
                                  <span className="font-dl-mono text-xs text-dl-muted">Requirements: </span>
                                  <span className="font-dl-mono text-xs text-dl-text">{s.requirements.join(' | ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.riskManagement && (
                      <div className="border border-dl-border p-4">
                        <h3 className="font-dl-serif text-base text-dl-navy mb-3">Risk Management Plan</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                          <div className="border border-dl-border p-3">
                            <span className="font-dl-mono text-xs text-dl-muted uppercase block">Reserve Requirement</span>
                            <span className="font-dl-mono text-xl font-bold text-dl-navy">${(aiAnalysis.riskManagement.reserveRequirement || 0).toLocaleString()}</span>
                            <p className="font-dl-mono text-xs text-dl-muted mt-1">{aiAnalysis.riskManagement.reserveRationale}</p>
                          </div>
                          <div className="border border-dl-border p-3">
                            <span className="font-dl-mono text-xs text-dl-muted uppercase block">Contingencies</span>
                            <ul className="space-y-1 mt-1">
                              {(aiAnalysis.riskManagement.contingencies || []).map((c: string, i: number) => (
                                <li key={i} className="font-dl-mono text-xs text-dl-text flex items-start gap-1">
                                  <span className="text-dl-navy">&#8226;</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {(aiAnalysis.riskManagement.exitScenarios || []).length > 0 && (
                          <div className="mb-3">
                            <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-2 font-bold">Exit Scenarios</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full font-dl-mono text-sm">
                                <thead>
                                  <tr className="border-b border-dl-border">
                                    <th className="text-left py-1 text-xs text-dl-muted uppercase">Scenario</th>
                                    <th className="text-left py-1 text-xs text-dl-muted uppercase">Timeline</th>
                                    <th className="text-left py-1 text-xs text-dl-muted uppercase">Projected Outcome</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {aiAnalysis.riskManagement.exitScenarios.map((e: any, i: number) => (
                                    <tr key={i} className="border-b border-dl-border">
                                      <td className="py-2 pr-2 text-dl-text">{e.scenario}</td>
                                      <td className="py-2 pr-2 text-dl-text">{e.timeline}</td>
                                      <td className="py-2 text-dl-text">{e.projectedOutcome}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {(aiAnalysis.riskManagement.insuranceConsiderations || []).length > 0 && (
                          <div>
                            <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-1 font-bold">Insurance Considerations</h4>
                            <ul className="space-y-1">
                              {aiAnalysis.riskManagement.insuranceConsiderations.map((ic: string, i: number) => (
                                <li key={i} className="font-dl-mono text-xs text-dl-text flex items-start gap-1">
                                  <span className="text-dl-navy">&#8226;</span> {ic}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {(aiAnalysis.pathToViability || []).length > 0 && (
                      <div className="border border-yellow-300 bg-yellow-50 p-4">
                        <h3 className="font-dl-serif text-base text-dl-navy mb-2">Path to Viability</h3>
                        <ul className="space-y-1">
                          {aiAnalysis.pathToViability.map((p: string, i: number) => (
                            <li key={i} className="font-dl-mono text-sm text-dl-text flex items-start gap-2">
                              <span className="text-yellow-600 mt-0.5 font-bold">{i + 1}.</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-green-200 p-4">
                        <h3 className="font-dl-mono text-xs text-green-700 uppercase mb-2 font-bold">Deal Strengths</h3>
                        <ul className="space-y-1">
                          {(aiAnalysis.strengths || []).map((s: string, i: number) => (
                            <li key={i} className="font-dl-mono text-sm text-dl-text flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">+</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border border-red-200 p-4">
                        <h3 className="font-dl-mono text-xs text-red-700 uppercase mb-2 font-bold">Deal Weaknesses</h3>
                        <ul className="space-y-1">
                          {(aiAnalysis.weaknesses || []).map((w: string, i: number) => (
                            <li key={i} className="font-dl-mono text-sm text-dl-text flex items-start gap-2">
                              <span className="text-red-600 mt-0.5">-</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-dl-border p-3">
                        <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Market Context</h4>
                        <p className="font-dl-mono text-sm text-dl-text">{aiAnalysis.marketContext}</p>
                      </div>
                      <div className="border border-dl-border p-3">
                        <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Exit Strategy</h4>
                        <p className="font-dl-mono text-sm text-dl-text">{aiAnalysis.exitStrategyNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ivcee' && activeScenarioId && (
              <IVCEEPanel dealId={id as string} scenarioId={activeScenarioId} />
            )}

            {activeTab === 'documents' && id && (
              <DocumentsPanel
                dealId={id as string}
                onApplyAssumptions={(mapped) => {
                  setAssumptions(prev => {
                    const updated = { ...prev };
                    for (const [key, val] of Object.entries(mapped)) {
                      if (key in updated) {
                        (updated as any)[key] = val;
                      }
                    }
                    return updated;
                  });
                }}
              />
            )}

            {activeTab === 'dueDiligence' && id && (
              <DueDiligencePanel dealId={id as string} />
            )}

            {activeTab === 'memo' && id && activeScenarioId && (
              <AcquisitionMemo dealId={id as string} scenarioId={activeScenarioId} />
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
                    className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
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

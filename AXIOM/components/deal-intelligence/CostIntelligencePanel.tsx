import { useState, useEffect, useCallback } from 'react';
import type { EstimateAssembly, EstimateTemplate, PropertyType, ScopeItem } from '../../lib/cost-intelligence/types';
import ScopeBuilder from '../cost-intelligence/ScopeBuilder';
import EstimateReview from '../cost-intelligence/EstimateReview';
import EstimateRangeView from '../cost-intelligence/EstimateRangeView';
import BenchmarkView from '../cost-intelligence/BenchmarkView';
import EstimateVersionHistory from '../cost-intelligence/EstimateVersionHistory';
import TemplateSelector from '../cost-intelligence/TemplateSelector';

interface Props {
  dealId: string;
  propertyId?: string;
  arvEstimate?: number;
}

type PanelTab = 'setup' | 'scope' | 'review';
type ReviewSubTab = 'detail' | 'range' | 'benchmark' | 'versions';

const REGION_OPTIONS = [
  { code: 'SOUTH_ATL', label: 'Atlanta Metro' },
  { code: 'SOUTH_CLT', label: 'Charlotte Metro' },
  { code: 'SOUTH_HOU', label: 'Houston Metro' },
  { code: 'SOUTH_DAL', label: 'Dallas-Fort Worth' },
  { code: 'SOUTH_PHX', label: 'Phoenix Metro' },
  { code: 'MID_CHI', label: 'Chicago Metro' },
  { code: 'MID_DET', label: 'Detroit Metro' },
  { code: 'NE_NYC', label: 'New York City' },
  { code: 'NE_PHI', label: 'Philadelphia' },
  { code: 'NE_BOS', label: 'Boston Metro' },
  { code: 'WEST_LA', label: 'Los Angeles' },
  { code: 'WEST_SF', label: 'San Francisco Bay' },
  { code: 'WEST_SEA', label: 'Seattle Metro' },
  { code: 'NATIONAL', label: 'National Average' },
];

const FMT = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const REVIEW_SUB_TABS: { key: ReviewSubTab; label: string }[] = [
  { key: 'detail', label: 'Line Items' },
  { key: 'range', label: 'Range Analysis' },
  { key: 'benchmark', label: 'Benchmark' },
  { key: 'versions', label: 'Versions' },
];

export default function CostIntelligencePanel({ dealId, propertyId, arvEstimate }: Props) {
  const [panelTab, setPanelTab] = useState<PanelTab>('setup');
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('detail');
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateAssembly | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saveSnapshot, setSaveSnapshot] = useState(false);
  const [genError, setGenError] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const [setupForm, setSetupForm] = useState({
    estimateName: 'Rehab Budget Estimate',
    propertyType: 'multifamily' as PropertyType,
    regionCode: 'SOUTH_ATL',
    totalUnits: 4,
    avgUnitSqft: 850,
    contingencyPct: 10,
    softCostPct: 5,
    laborAdjPct: 0,
    materialAdjPct: 0,
    arvEstimate: arvEstimate || 0,
  });

  useEffect(() => {
    if (arvEstimate) setSetupForm(f => ({ ...f, arvEstimate }));
  }, [arvEstimate]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/cost-intelligence/estimates?dealId=${dealId}`);
      const json = await res.json();
      setEstimates(json.estimates || []);
      if (json.estimates?.length && !selectedEstimateId) {
        setSelectedEstimateId(json.estimates[0].id);
      }
    } catch {}
    finally { setLoadingList(false); }
  }, [dealId, selectedEstimateId]);

  const loadEstimate = useCallback(async (id: string) => {
    setLoadingEstimate(true);
    try {
      const res = await fetch(`/api/cost-intelligence/estimates/${id}`);
      const json = await res.json();
      setEstimate(json.estimate || null);
    } catch {}
    finally { setLoadingEstimate(false); }
  }, []);

  useEffect(() => { loadList(); }, [dealId]);
  useEffect(() => {
    if (selectedEstimateId) loadEstimate(selectedEstimateId);
  }, [selectedEstimateId]);

  async function handleCreateEstimate() {
    setGenError('');
    try {
      const res = await fetch('/api/cost-intelligence/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          propertyId: propertyId || null,
          estimateName: setupForm.estimateName,
          propertyType: setupForm.propertyType,
          regionCode: setupForm.regionCode,
          totalUnits: setupForm.totalUnits,
          avgUnitSqft: setupForm.avgUnitSqft,
          contingencyPct: setupForm.contingencyPct / 100,
          softCostPct: setupForm.softCostPct / 100,
          laborAdjPct: setupForm.laborAdjPct / 100,
          materialAdjPct: setupForm.materialAdjPct / 100,
          arvEstimate: setupForm.arvEstimate || null,
        }),
      });
      const json = await res.json();
      if (json.error) { setGenError(json.error); return; }
      await loadList();
      setSelectedEstimateId(json.estimate.id);
      setPanelTab('scope');
    } catch { setGenError('Failed to create estimate'); }
  }

  async function handleGenerate() {
    if (!selectedEstimateId) return;
    setGenerating(true); setGenError('');
    try {
      const res = await fetch(`/api/cost-intelligence/estimates/${selectedEstimateId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arvEstimate: setupForm.arvEstimate || null,
          saveVersionSnapshot: saveSnapshot,
        }),
      });
      const json = await res.json();
      if (json.error) { setGenError(json.error); return; }
      setEstimate(json.estimate);
      setPanelTab('review');
      setReviewSubTab('detail');
    } catch { setGenError('Generation failed'); }
    finally { setGenerating(false); }
  }

  async function handleApplyTemplate(template: EstimateTemplate) {
    if (!selectedEstimateId) return;
    setApplyingTemplate(true); setGenError('');
    try {
      for (const item of template.scopeItems) {
        await fetch(`/api/cost-intelligence/estimates/${selectedEstimateId}/scope`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trade: item.trade || 'General',
            itemName: item.itemName,
            condition: item.condition || 'medium_rehab',
            repairOrReplace: item.repairOrReplace || 'replace',
            quantity: item.quantity || 1,
            unit: item.unit || 'per_unit',
            appliesToAllUnits: item.appliesToAllUnits !== false,
            wasteFactor: item.wasteFactor || 0.05,
            contingencyFactor: item.contingencyFactor || 0.10,
            autoMap: true,
          }),
        });
      }
      await loadEstimate(selectedEstimateId);
      setPanelTab('scope');
    } catch { setGenError('Failed to apply template'); }
    finally { setApplyingTemplate(false); }
  }

  const currentEstimateMeta = estimates.find(e => e.id === selectedEstimateId);
  const scopeItems: ScopeItem[] = (estimate?.scopeItems || []) as ScopeItem[];
  const hasEstimate = estimate && estimate.lineItems?.length > 0;

  return (
    <div className="border border-dl-border">
      <div className="border-b border-dl-border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy">Cost Intelligence Engine</h2>
          <p className="font-dl-mono text-xs text-dl-muted">
            Craftsman NCE-grounded rehab estimate · {REGION_OPTIONS.find(r => r.code === setupForm.regionCode)?.label}
          </p>
        </div>
        {estimates.length > 0 && (
          <select
            value={selectedEstimateId || ''}
            onChange={e => {
              setSelectedEstimateId(e.target.value);
              setEstimate(null);
              setPanelTab('scope');
            }}
            className="border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white max-w-xs"
          >
            {estimates.map(e => (
              <option key={e.id} value={e.id}>
                {e.estimate_name} — {e.status} {e.grand_total ? `(${FMT(e.grand_total)})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {estimates.length > 0 && selectedEstimateId && (
        <div className="flex border-b border-dl-border overflow-x-auto">
          {(['setup', 'scope', 'review'] as PanelTab[]).map(t => (
            <button
              key={t}
              onClick={() => setPanelTab(t)}
              className={`px-4 py-2 font-dl-mono text-xs border-b-2 -mb-px capitalize whitespace-nowrap ${
                panelTab === t
                  ? 'border-dl-navy text-dl-navy'
                  : 'border-transparent text-dl-muted hover:text-dl-text'
              }`}
            >
              {t === 'setup' ? 'Settings' : t === 'scope' ? `Scope (${scopeItems.length})` : 'Estimate'}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 sm:p-6">
        {loadingList ? (
          <p className="font-dl-mono text-xs text-dl-muted">Loading estimates…</p>
        ) : !selectedEstimateId ? (
          <div className="space-y-6">
            <p className="font-dl-mono text-xs text-dl-muted uppercase border-b border-dl-border pb-2">New Estimate Setup</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Estimate Name</label>
                <input
                  type="text"
                  value={setupForm.estimateName}
                  onChange={e => setSetupForm(f => ({ ...f, estimateName: e.target.value }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                />
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Property Type</label>
                <select
                  value={setupForm.propertyType}
                  onChange={e => setSetupForm(f => ({ ...f, propertyType: e.target.value as PropertyType }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                >
                  <option value="multifamily">Multifamily</option>
                  <option value="sfr">Single-Family</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Region</label>
                <select
                  value={setupForm.regionCode}
                  onChange={e => setSetupForm(f => ({ ...f, regionCode: e.target.value }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                >
                  {REGION_OPTIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Total Units</label>
                <input type="number" min={1} value={setupForm.totalUnits}
                  onChange={e => setSetupForm(f => ({ ...f, totalUnits: Number(e.target.value) }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm" />
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Avg Unit Sq Ft</label>
                <input type="number" min={1} value={setupForm.avgUnitSqft}
                  onChange={e => setSetupForm(f => ({ ...f, avgUnitSqft: Number(e.target.value) }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm" />
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">ARV Estimate ($)</label>
                <input type="number" min={0} value={setupForm.arvEstimate || ''}
                  onChange={e => setSetupForm(f => ({ ...f, arvEstimate: Number(e.target.value) }))}
                  placeholder="e.g. 280000"
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm" />
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Contingency %</label>
                <input type="number" min={0} max={30} value={setupForm.contingencyPct}
                  onChange={e => setSetupForm(f => ({ ...f, contingencyPct: Number(e.target.value) }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm" />
              </div>
              <div>
                <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Soft Cost %</label>
                <input type="number" min={0} max={20} value={setupForm.softCostPct}
                  onChange={e => setSetupForm(f => ({ ...f, softCostPct: Number(e.target.value) }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm" />
              </div>
            </div>

            {genError && <p className="font-dl-mono text-xs text-red-600">{genError}</p>}
            <button onClick={handleCreateEstimate} className="bg-dl-navy text-white px-8 py-2 font-dl-mono text-sm">
              Create Estimate
            </button>
          </div>

        ) : (
          <>
            {panelTab === 'setup' && (
              <div className="space-y-4">
                <p className="font-dl-mono text-xs text-dl-muted uppercase border-b border-dl-border pb-2">
                  Estimate Settings — {currentEstimateMeta?.estimate_name}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-dl-mono text-xs">
                  <div>
                    <p className="text-dl-muted uppercase mb-1">Property Type</p>
                    <p className="text-dl-navy font-bold">{currentEstimateMeta?.property_type}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted uppercase mb-1">Region</p>
                    <p className="text-dl-navy font-bold">{currentEstimateMeta?.region_code}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted uppercase mb-1">Total Units</p>
                    <p className="text-dl-navy font-bold">{currentEstimateMeta?.total_units}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted uppercase mb-1">Status</p>
                    <p className="text-dl-navy font-bold uppercase">{currentEstimateMeta?.status}</p>
                  </div>
                  {currentEstimateMeta?.grand_total && (
                    <div>
                      <p className="text-dl-muted uppercase mb-1">Grand Total</p>
                      <p className="text-dl-navy font-bold">{FMT(Number(currentEstimateMeta.grand_total))}</p>
                    </div>
                  )}
                  {currentEstimateMeta?.confidence && (
                    <div>
                      <p className="text-dl-muted uppercase mb-1">Confidence</p>
                      <p className={`font-bold ${Number(currentEstimateMeta.confidence) >= 0.8 ? 'text-dl-forest' : 'text-yellow-700'}`}>
                        {Math.round(Number(currentEstimateMeta.confidence) * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="border border-dl-border p-4 mt-4">
                  <p className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Load from Template</p>
                  <TemplateSelector
                    propertyType={(currentEstimateMeta?.property_type as PropertyType) || 'multifamily'}
                    onApply={handleApplyTemplate}
                    disabled={applyingTemplate}
                  />
                  {applyingTemplate && (
                    <p className="font-dl-mono text-xs text-dl-muted mt-2">Applying template…</p>
                  )}
                </div>
              </div>
            )}

            {panelTab === 'scope' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="font-dl-mono text-xs text-dl-muted uppercase">
                      Scope of Work — {scopeItems.length} item{scopeItems.length !== 1 ? 's' : ''}
                    </p>
                    {!scopeItems.length && (
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">
                        Add scope items below, or load from a template on the Settings tab.
                      </p>
                    )}
                  </div>
                  {scopeItems.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 font-dl-mono text-xs text-dl-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveSnapshot}
                          onChange={e => setSaveSnapshot(e.target.checked)}
                          className="w-3 h-3"
                        />
                        Save snapshot
                      </label>
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm disabled:opacity-40"
                      >
                        {generating ? 'Generating…' : 'Generate Estimate →'}
                      </button>
                    </div>
                  )}
                </div>

                {genError && <p className="font-dl-mono text-xs text-red-600 mb-3">{genError}</p>}

                {loadingEstimate ? (
                  <p className="font-dl-mono text-xs text-dl-muted">Loading scope items…</p>
                ) : (
                  <ScopeBuilder
                    estimateId={selectedEstimateId!}
                    scopeItems={scopeItems as any}
                    propertyType={(currentEstimateMeta?.property_type as PropertyType) || 'multifamily'}
                    onScopeChanged={() => loadEstimate(selectedEstimateId!)}
                  />
                )}
              </div>
            )}

            {panelTab === 'review' && (
              <div>
                {!hasEstimate ? (
                  <div>
                    <p className="font-dl-mono text-sm text-dl-muted mb-4">
                      No estimate generated yet. Add scope items and click Generate.
                    </p>
                    <button
                      onClick={() => setPanelTab('scope')}
                      className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm"
                    >
                      Go to Scope
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <p className="font-dl-mono text-xs text-dl-muted uppercase">
                        {estimate.estimateName || 'Estimate'} · v{estimate.version} · Confidence {Math.round(estimate.confidence * 100)}%
                      </p>
                      <div className="sm:ml-auto flex items-center gap-2">
                        <label className="flex items-center gap-1.5 font-dl-mono text-xs text-dl-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveSnapshot}
                            onChange={e => setSaveSnapshot(e.target.checked)}
                            className="w-3 h-3"
                          />
                          Snapshot
                        </label>
                        <button
                          onClick={() => setPanelTab('scope')}
                          className="border border-dl-border text-dl-muted px-3 py-1.5 font-dl-mono text-xs"
                        >
                          Edit Scope
                        </button>
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="bg-dl-navy text-white px-3 py-1.5 font-dl-mono text-xs disabled:opacity-40"
                        >
                          {generating ? 'Re-running…' : 'Re-generate'}
                        </button>
                      </div>
                    </div>

                    {genError && <p className="font-dl-mono text-xs text-red-600 mb-3">{genError}</p>}

                    <div className="flex border-b border-dl-border mb-4 overflow-x-auto">
                      {REVIEW_SUB_TABS.map(sub => (
                        <button
                          key={sub.key}
                          onClick={() => setReviewSubTab(sub.key)}
                          className={`px-4 py-2 font-dl-mono text-xs border-b-2 -mb-px whitespace-nowrap ${
                            reviewSubTab === sub.key
                              ? 'border-dl-forest text-dl-forest'
                              : 'border-transparent text-dl-muted hover:text-dl-text'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {reviewSubTab === 'detail' && <EstimateReview estimate={estimate} />}
                    {reviewSubTab === 'range' && <EstimateRangeView estimate={estimate} />}
                    {reviewSubTab === 'benchmark' && (
                      <BenchmarkView
                        estimateId={estimate.estimateId}
                        dealId={estimate.dealId}
                        providerEstimate={estimate.hardCostTotal}
                        adjustedEstimate={estimate.grandTotal}
                        propertyType={estimate.propertyType}
                        regionCode={estimate.regionCode}
                      />
                    )}
                    {reviewSubTab === 'versions' && (
                      <EstimateVersionHistory
                        estimateId={estimate.estimateId}
                        currentVersion={estimate.version}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedEstimateId && (
        <div className="border-t border-dl-border px-6 py-2 flex items-center gap-4">
          <button
            onClick={() => { setSelectedEstimateId(null); setEstimate(null); }}
            className="font-dl-mono text-xs text-dl-navy underline"
          >
            + New estimate
          </button>
          {estimates.length > 1 && (
            <p className="font-dl-mono text-xs text-dl-muted">
              {estimates.length} estimates for this deal
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

const SFR_SYSTEMS: { key: string; label: string; costUnit: string }[] = [
  { key: 'kitchen', label: 'Kitchen', costUnit: 'per_unit' },
  { key: 'bathroom', label: 'Bathroom', costUnit: 'per_unit' },
  { key: 'flooring', label: 'Flooring', costUnit: 'per_sqft' },
  { key: 'appliances', label: 'Appliances', costUnit: 'per_unit' },
  { key: 'hvac', label: 'HVAC', costUnit: 'per_unit' },
  { key: 'windows', label: 'Windows', costUnit: 'per_window' },
  { key: 'paint', label: 'Paint', costUnit: 'per_sqft' },
  { key: 'plumbing', label: 'Plumbing', costUnit: 'per_unit' },
  { key: 'electrical', label: 'Electrical', costUnit: 'per_unit' },
  { key: 'doors', label: 'Doors', costUnit: 'per_door' },
  { key: 'exterior', label: 'Exterior', costUnit: 'per_sqft' },
  { key: 'roof', label: 'Roof', costUnit: 'per_sqft' },
  { key: 'foundation', label: 'Foundation', costUnit: 'flat' },
  { key: 'garage', label: 'Garage', costUnit: 'flat' },
  { key: 'landscaping', label: 'Landscaping', costUnit: 'flat' },
  { key: 'other', label: 'Other', costUnit: 'flat' },
];

const MF_SYSTEMS: { key: string; label: string; costUnit: string }[] = [
  { key: 'kitchen', label: 'Kitchen', costUnit: 'per_unit' },
  { key: 'bathroom', label: 'Bathroom', costUnit: 'per_unit' },
  { key: 'flooring', label: 'Flooring', costUnit: 'per_sqft' },
  { key: 'appliances', label: 'Appliances', costUnit: 'per_unit' },
  { key: 'hvac', label: 'HVAC', costUnit: 'per_unit' },
  { key: 'windows', label: 'Windows', costUnit: 'per_window' },
  { key: 'paint', label: 'Paint', costUnit: 'per_sqft' },
  { key: 'plumbing', label: 'Plumbing', costUnit: 'per_unit' },
  { key: 'electrical', label: 'Electrical', costUnit: 'per_unit' },
  { key: 'doors', label: 'Doors', costUnit: 'per_door' },
  { key: 'exterior', label: 'Exterior', costUnit: 'per_sqft' },
  { key: 'roof', label: 'Roof', costUnit: 'per_sqft' },
  { key: 'common_area', label: 'Common Area', costUnit: 'per_unit' },
  { key: 'laundry_room', label: 'Laundry Room', costUnit: 'flat' },
  { key: 'site_parking', label: 'Site / Parking', costUnit: 'flat' },
  { key: 'foundation', label: 'Foundation', costUnit: 'flat' },
  { key: 'landscaping', label: 'Landscaping', costUnit: 'flat' },
  { key: 'other', label: 'Other', costUnit: 'flat' },
];

type Condition = 'good' | 'light_rehab' | 'medium_rehab' | 'full_replace' | 'not_inspected';
type PropertyType = 'multifamily' | 'sfr';

const CONDITIONS: { key: Condition; abbr: string; label: string; activeClass: string; textClass: string; condKey: string }[] = [
  { key: 'good', abbr: 'OK', label: 'Good', activeClass: 'bg-green-700 border-green-700 text-white', textClass: 'text-green-700', condKey: '' },
  { key: 'light_rehab', abbr: 'LT', label: 'Light', activeClass: 'bg-yellow-600 border-yellow-600 text-white', textClass: 'text-yellow-700', condKey: 'light_rehab' },
  { key: 'medium_rehab', abbr: 'MD', label: 'Medium', activeClass: 'bg-orange-600 border-orange-600 text-white', textClass: 'text-orange-700', condKey: 'medium_rehab' },
  { key: 'full_replace', abbr: 'FL', label: 'Full Replace', activeClass: 'bg-red-700 border-red-700 text-white', textClass: 'text-red-700', condKey: 'full_replace' },
];

type CostBenchmark = {
  cost_unit: string;
  cost_low: number;
  cost_mid: number;
  cost_high: number;
  notes: string;
  source: string;
};

type Benchmarks = Record<string, Record<string, CostBenchmark>>;

function fmt(n: number, unit: string): string {
  if (unit === 'per_sqft' || unit === 'per_window' || unit === 'per_door') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function conditionAbbr(c: Condition) {
  if (c === 'not_inspected') return '--';
  return CONDITIONS.find((x) => x.key === c)?.abbr || '--';
}

function conditionColor(c: Condition) {
  return CONDITIONS.find((x) => x.key === c)?.textClass || 'text-dl-muted';
}

function conditionLabel(c: Condition) {
  if (c === 'not_inspected') return 'Not Inspected';
  return CONDITIONS.find((x) => x.key === c)?.label || c;
}

type Session = {
  id: string;
  deal_id: string;
  session_name: string;
  status: string;
  total_units: number;
  units_walked: number;
  sampling_confidence_score: string | null;
  property_type: string;
  created_at: string;
};

type WalkRow = {
  id: string;
  unit_number: string;
  unit_type: string | null;
  occupancy_status: string | null;
  general_notes: string | null;
  [key: string]: any;
};

type ScopeResult = {
  scopeId: string;
  scope: {
    strategies: {
      [strategy: string]: {
        [tier: string]: {
          total: number;
          sqft_rate: number;
          mao: number;
          line_items: { system: string; description: string; cost: number }[];
          rationale: string;
        };
      };
    };
    recommended_tier: string;
    recommended_strategy: string;
    confidence: number;
    notes: string;
  };
  arvEstimate: number;
  unitsInspected: number;
  totalUnits: number;
};

type Summary = {
  units_in_good_condition: number;
  units_needing_light_rehab: number;
  units_needing_medium_rehab: number;
  units_needing_full_rehab: number;
  units_not_inspected: number;
  sampling_percentage: string;
  system_issue_distribution: Record<string, Record<string, number>>;
  estimated_total_rehab_cost: string;
  estimated_avg_cost_per_unit: string;
  total_deficiencies: number;
  critical_deficiencies: number;
};

const makeDefaultConditions = (systems: { key: string }[]) =>
  Object.fromEntries(systems.map((s) => [s.key, 'not_inspected' as Condition]));

interface Props {
  dealId: string;
  propertyId?: string | null;
  arvEstimate?: number;
}

export default function FieldIntelligencePanel({ dealId, propertyId, arvEstimate = 0 }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [walkRows, setWalkRows] = useState<WalkRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scopeResult, setScopeResult] = useState<ScopeResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmarks>({});
  const [showCostRef, setShowCostRef] = useState(false);

  const [view, setView] = useState<'sessions' | 'walk' | 'scope'>('sessions');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);

  const [newSession, setNewSession] = useState({
    sessionName: '',
    totalUnits: '',
    inspectedBy: '',
    propertyType: 'multifamily' as PropertyType,
  });
  const [creatingSession, setCreatingSession] = useState(false);

  const [unitForm, setUnitForm] = useState({ unitNumber: '', unitType: '', occupancyStatus: 'vacant', generalNotes: '', sqft: '' });
  const [unitConditions, setUnitConditions] = useState<Record<string, Condition>>(makeDefaultConditions(MF_SYSTEMS));
  const [savingUnit, setSavingUnit] = useState(false);

  const [computingSummary, setComputingSummary] = useState(false);
  const [generatingScope, setGeneratingScope] = useState(false);
  const [scopeArv, setScopeArv] = useState(arvEstimate > 0 ? String(arvEstimate) : '');
  const [activeStrategyTab, setActiveStrategyTab] = useState<'flip' | 'brrrr' | 'hold'>('flip');

  const [error, setError] = useState('');

  const activeSystems = activeSession?.property_type === 'sfr' ? SFR_SYSTEMS : MF_SYSTEMS;

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/field-intelligence/sessions?dealId=${dealId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [dealId]);

  const loadBenchmarks = useCallback(async (pt: string) => {
    try {
      const res = await fetch(`/api/rehab-costs?property_type=${pt}`);
      const data = await res.json();
      setBenchmarks(data.benchmarks || {});
    } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadWalkRows = async (sessionId: string) => {
    const res = await fetch(`/api/field-intelligence/walks/${sessionId}`);
    const data = await res.json();
    setWalkRows(Array.isArray(data) ? data : []);
  };

  const handleCreateSession = async () => {
    if (!newSession.sessionName || !newSession.totalUnits) return;
    setCreatingSession(true);
    setError('');
    try {
      const res = await fetch('/api/field-intelligence/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          propertyId: propertyId || undefined,
          sessionName: newSession.sessionName,
          totalUnits: Number(newSession.totalUnits),
          inspectedBy: newSession.inspectedBy || undefined,
          propertyType: newSession.propertyType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create session'); return; }
      await loadSessions();
      setShowNewSessionForm(false);
      setNewSession({ sessionName: '', totalUnits: '', inspectedBy: '', propertyType: 'multifamily' });
      openSession(data);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setCreatingSession(false);
    }
  };

  const openSession = async (session: Session) => {
    setActiveSession(session);
    setView('walk');
    setSummary(null);
    setScopeResult(null);
    setShowAddUnit(false);
    setShowCostRef(false);
    const pt = session.property_type || 'multifamily';
    const systems = pt === 'sfr' ? SFR_SYSTEMS : MF_SYSTEMS;
    setUnitConditions(makeDefaultConditions(systems));
    await loadBenchmarks(pt);
    await loadWalkRows(session.id);
  };

  const handleSaveUnit = async () => {
    if (!activeSession || !unitForm.unitNumber) return;
    setSavingUnit(true);
    setError('');
    try {
      const body: Record<string, any> = {
        unitNumber: unitForm.unitNumber,
        unitType: unitForm.unitType || null,
        occupancyStatus: unitForm.occupancyStatus || null,
        generalNotes: unitForm.generalNotes || null,
        sqft: unitForm.sqft ? Number(unitForm.sqft) : null,
        ...unitConditions,
        commonArea: unitConditions['common_area'],
        siteParking: unitConditions['site_parking'],
      };
      const res = await fetch(`/api/field-intelligence/walks/${activeSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save unit'); return; }
      setWalkRows((prev) => [...prev, data]);
      setActiveSession((prev) => prev ? { ...prev, units_walked: (prev.units_walked || 0) + 1 } : prev);
      setUnitForm({ unitNumber: '', unitType: '', occupancyStatus: 'vacant', generalNotes: '', sqft: '' });
      setUnitConditions(makeDefaultConditions(activeSystems));
      setShowAddUnit(false);
      setSummary(null);
    } finally {
      setSavingUnit(false);
    }
  };

  const handleComputeSummary = async () => {
    if (!activeSession) return;
    setComputingSummary(true);
    setError('');
    try {
      const res = await fetch(`/api/field-intelligence/summary?sessionId=${activeSession.id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to compute summary'); return; }
      setSummary(data);
    } finally {
      setComputingSummary(false);
    }
  };

  const handleGenerateScope = async () => {
    if (!activeSession) return;
    setGeneratingScope(true);
    setError('');
    try {
      const res = await fetch(`/api/field-intelligence/${activeSession.id}/generate-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arvEstimate: Number(scopeArv) || arvEstimate, propertyType: activeSession.property_type }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Scope generation failed'); return; }
      setScopeResult(data);
      setView('scope');
    } finally {
      setGeneratingScope(false);
    }
  };

  const setCondition = (sys: string, cond: Condition) => {
    setUnitConditions((prev) => ({ ...prev, [sys]: cond }));
  };

  const confidence = activeSession
    ? Math.round((Number(activeSession.sampling_confidence_score || 0)) * 100)
    : 0;

  if (view === 'sessions') {
    return (
      <div className="border border-dl-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-dl-serif text-lg text-dl-navy">Field Intelligence</h2>
            <p className="font-dl-mono text-xs text-dl-muted mt-0.5">Unit walk sessions — structured condition capture</p>
          </div>
          <button
            onClick={() => setShowNewSessionForm(true)}
            className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm"
          >
            New Session
          </button>
        </div>

        {error && <p className="font-dl-mono text-sm text-red-600 mb-4 border border-red-200 px-3 py-2">{error}</p>}

        {showNewSessionForm && (
          <div className="border border-dl-border p-4 mb-5 bg-dl-bg">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">New Inspection Session</h3>

            <div className="mb-3">
              <label className="block text-xs font-dl-mono text-dl-muted mb-1">Property Type</label>
              <div className="flex gap-2">
                {([['multifamily', 'Multi-Family'], ['sfr', 'Single Family (SFR)']] as [PropertyType, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewSession((p) => ({ ...p, propertyType: val }))}
                    className={`px-4 py-2 font-dl-mono text-sm border min-h-[40px] ${
                      newSession.propertyType === val
                        ? 'bg-dl-navy text-white border-dl-navy'
                        : 'border-dl-border text-dl-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Session Name</label>
                <input
                  type="text"
                  value={newSession.sessionName}
                  onChange={(e) => setNewSession((p) => ({ ...p, sessionName: e.target.value }))}
                  placeholder="e.g. Initial Walkthrough"
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">
                  {newSession.propertyType === 'sfr' ? 'Total Units' : 'Total Units'}
                </label>
                <input
                  type="number"
                  value={newSession.totalUnits}
                  onChange={(e) => setNewSession((p) => ({ ...p, totalUnits: e.target.value }))}
                  min={1}
                  placeholder={newSession.propertyType === 'sfr' ? '1' : '12'}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Inspector Name</label>
                <input
                  type="text"
                  value={newSession.inspectedBy}
                  onChange={(e) => setNewSession((p) => ({ ...p, inspectedBy: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateSession}
                disabled={creatingSession || !newSession.sessionName || !newSession.totalUnits}
                className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
              >
                {creatingSession ? 'Creating...' : 'Create Session'}
              </button>
              <button
                onClick={() => { setShowNewSessionForm(false); setError(''); }}
                className="border border-dl-border px-4 py-2 min-h-[44px] font-dl-mono text-sm text-dl-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loadingSessions ? (
          <p className="font-dl-mono text-sm text-dl-muted">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-sm text-dl-muted mb-1">No inspection sessions yet.</p>
            <p className="font-dl-mono text-xs text-dl-muted">Create a session to begin the unit walk.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const conf = Math.round(Number(session.sampling_confidence_score || 0) * 100);
              const pt = session.property_type || 'multifamily';
              const statusColors: Record<string, string> = {
                planned: 'text-dl-muted',
                in_progress: 'text-yellow-700',
                submitted: 'text-dl-forest',
                reviewed: 'text-dl-navy',
                completed: 'text-dl-forest',
              };
              return (
                <button
                  key={session.id}
                  onClick={() => openSession(session)}
                  className="w-full border border-dl-border p-4 text-left hover:border-dl-navy flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="font-dl-serif text-base text-dl-navy">{session.session_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="font-dl-mono text-xs text-dl-muted">
                        {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <span className="font-dl-mono text-xs border border-dl-border px-1.5 py-0.5 text-dl-muted uppercase">
                        {pt === 'sfr' ? 'SFR' : 'Multi-Family'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-dl-mono text-xs text-dl-muted">Units</p>
                      <p className="font-dl-mono text-sm font-bold text-dl-navy">
                        {session.units_walked} / {session.total_units}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-xs text-dl-muted">Confidence</p>
                      <p className="font-dl-mono text-sm font-bold text-dl-navy">{conf}%</p>
                    </div>
                    <span className={`font-dl-mono text-xs uppercase ${statusColors[session.status] || 'text-dl-muted'}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (view === 'walk' && activeSession) {
    const totalUnits = activeSession.total_units || 0;
    const unitsWalked = walkRows.length;
    const pctWalked = totalUnits > 0 ? Math.round((unitsWalked / totalUnits) * 100) : 0;
    const pt = activeSession.property_type || 'multifamily';

    return (
      <div className="border border-dl-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <button
              onClick={() => { setView('sessions'); loadSessions(); }}
              className="font-dl-mono text-xs text-dl-navy underline mb-1 block"
            >
              Back to Sessions
            </button>
            <h2 className="font-dl-serif text-lg text-dl-navy">{activeSession.session_name}</h2>
            <span className="font-dl-mono text-xs border border-dl-border px-1.5 py-0.5 text-dl-muted uppercase">
              {pt === 'sfr' ? 'Single Family' : 'Multi-Family'}
            </span>
          </div>
          <div className="text-right">
            <p className="font-dl-mono text-xs text-dl-muted">Progress</p>
            <p className="font-dl-mono text-sm font-bold text-dl-navy">{unitsWalked} / {totalUnits} units ({pctWalked}%)</p>
            <p className="font-dl-mono text-xs text-dl-muted">Confidence: {confidence}%</p>
          </div>
        </div>

        {error && <p className="font-dl-mono text-sm text-red-600 mb-4 border border-red-200 px-3 py-2">{error}</p>}

        <div className="w-full border border-dl-border h-1.5 mb-5 bg-gray-100">
          <div className="h-full bg-dl-navy" style={{ width: `${pctWalked}%` }} />
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          {!showAddUnit && (
            <button
              onClick={() => setShowAddUnit(true)}
              className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm"
            >
              + Add Unit Walk
            </button>
          )}
          <button
            onClick={() => setShowCostRef((v) => !v)}
            className="border border-dl-border px-4 py-2 min-h-[44px] font-dl-mono text-sm text-dl-navy"
          >
            {showCostRef ? 'Hide' : 'Show'} Craftsman Cost Reference
          </button>
        </div>

        {showCostRef && Object.keys(benchmarks).length > 0 && (
          <div className="border border-dl-border mb-5 overflow-x-auto">
            <div className="bg-dl-bg border-b border-dl-border px-4 py-2 flex items-center justify-between">
              <p className="font-dl-mono text-xs text-dl-muted uppercase">Craftsman National Construction Estimator — Reference Costs</p>
              <p className="font-dl-mono text-xs text-dl-muted">{pt === 'sfr' ? 'Single Family' : 'Multi-Family'}</p>
            </div>
            <table className="w-full font-dl-mono text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-dl-border">
                  <th className="text-left py-2 px-3 text-dl-muted font-normal">System</th>
                  <th className="text-left py-2 px-3 text-dl-muted font-normal">Unit</th>
                  <th className="text-center py-2 px-3 text-yellow-700 font-normal">Light Rehab</th>
                  <th className="text-center py-2 px-3 text-orange-700 font-normal">Medium Rehab</th>
                  <th className="text-center py-2 px-3 text-red-700 font-normal">Full Replace</th>
                </tr>
              </thead>
              <tbody>
                {activeSystems.filter(s => benchmarks[s.key]).map((sys) => {
                  const b = benchmarks[sys.key];
                  return (
                    <tr key={sys.key} className="border-b border-dl-border hover:bg-dl-bg">
                      <td className="py-1.5 px-3 text-dl-text font-medium">{sys.label}</td>
                      <td className="py-1.5 px-3 text-dl-muted">{sys.costUnit.replace('_', ' ')}</td>
                      {(['light_rehab', 'medium_rehab', 'full_replace'] as const).map((cond) => {
                        const cb = b[cond];
                        return (
                          <td key={cond} className="py-1.5 px-3 text-center">
                            {cb ? (
                              <span className="text-dl-text">
                                {fmt(cb.cost_low, cb.cost_unit)} – {fmt(cb.cost_high, cb.cost_unit)}
                              </span>
                            ) : (
                              <span className="text-dl-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-dl-border">
              <p className="font-dl-mono text-xs text-dl-muted">Source: Craftsman National Construction Estimator — national averages. Regional labor adjustments apply. Not a contractor quote.</p>
            </div>
          </div>
        )}

        {showAddUnit && (
          <div className="border border-dl-border p-4 mb-5">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-2">
              Record Unit Conditions — {pt === 'sfr' ? 'Single Family' : 'Multi-Family'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Unit #</label>
                <input
                  type="text"
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))}
                  placeholder={pt === 'sfr' ? 'Main' : '101'}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Type</label>
                <select
                  value={unitForm.unitType}
                  onChange={(e) => setUnitForm((p) => ({ ...p, unitType: e.target.value }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                >
                  <option value="">--</option>
                  {pt === 'sfr' ? (
                    <>
                      <option>2BR/1BA</option>
                      <option>3BR/1BA</option>
                      <option>3BR/2BA</option>
                      <option>4BR/2BA</option>
                      <option>4BR/3BA</option>
                      <option>Other SFR</option>
                    </>
                  ) : (
                    <>
                      <option>Studio</option>
                      <option>1BR</option>
                      <option>2BR</option>
                      <option>3BR</option>
                      <option>4BR+</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Occupancy</label>
                <select
                  value={unitForm.occupancyStatus}
                  onChange={(e) => setUnitForm((p) => ({ ...p, occupancyStatus: e.target.value }))}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                >
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="model">Model Unit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Sqft</label>
                <input
                  type="number"
                  value={unitForm.sqft}
                  onChange={(e) => setUnitForm((p) => ({ ...p, sqft: e.target.value }))}
                  placeholder="1200"
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Notes</label>
                <input
                  type="text"
                  value={unitForm.generalNotes}
                  onChange={(e) => setUnitForm((p) => ({ ...p, generalNotes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
            </div>

            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">
              System Conditions — OK / Light / Medium / Full Replace
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4">
              {activeSystems.map((sys) => {
                const currentCond = unitConditions[sys.key] || 'not_inspected';
                const bSys = benchmarks[sys.key];
                const condBench = currentCond !== 'good' && currentCond !== 'not_inspected' && bSys ? bSys[currentCond] : null;
                return (
                  <div key={sys.key} className="flex items-start gap-2">
                    <div className="w-28 shrink-0 pt-1">
                      <span className="font-dl-mono text-xs text-dl-text">{sys.label}</span>
                      {condBench && (
                        <p className="font-dl-mono text-xs text-dl-muted leading-tight">
                          {fmt(condBench.cost_mid, condBench.cost_unit)}/{sys.costUnit.replace('per_', '')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {CONDITIONS.map((cond) => (
                        <button
                          key={cond.key}
                          type="button"
                          onClick={() => setCondition(sys.key, cond.key)}
                          className={`px-2 py-1 min-h-[32px] font-dl-mono text-xs border ${
                            unitConditions[sys.key] === cond.key
                              ? cond.activeClass
                              : 'border-dl-border text-dl-muted hover:border-dl-navy'
                          }`}
                        >
                          {cond.abbr}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveUnit}
                disabled={savingUnit || !unitForm.unitNumber}
                className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
              >
                {savingUnit ? 'Saving...' : 'Save Unit'}
              </button>
              <button
                onClick={() => { setShowAddUnit(false); setError(''); }}
                className="border border-dl-border px-4 py-2 min-h-[44px] font-dl-mono text-sm text-dl-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {walkRows.length > 0 && (
          <div className="mb-5">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-2 border-b border-dl-border pb-1">
              Units Walked ({walkRows.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full font-dl-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left py-1.5 px-2 text-dl-muted font-normal whitespace-nowrap">Unit</th>
                    <th className="text-left py-1.5 px-2 text-dl-muted font-normal whitespace-nowrap">Type</th>
                    <th className="text-left py-1.5 px-2 text-dl-muted font-normal whitespace-nowrap">Sqft</th>
                    {activeSystems.slice(0, 7).map((s) => (
                      <th key={s.key} className="text-center py-1.5 px-1 text-dl-muted font-normal whitespace-nowrap">
                        {s.label.slice(0, 4)}
                      </th>
                    ))}
                    <th className="text-center py-1.5 px-1 text-dl-muted font-normal">+{activeSystems.length - 7}</th>
                  </tr>
                </thead>
                <tbody>
                  {walkRows.map((row) => (
                    <tr key={row.id} className="border-b border-dl-border hover:bg-dl-bg">
                      <td className="py-1.5 px-2 text-dl-text font-medium whitespace-nowrap">{row.unit_number}</td>
                      <td className="py-1.5 px-2 text-dl-muted whitespace-nowrap">{row.unit_type || '--'}</td>
                      <td className="py-1.5 px-2 text-dl-muted whitespace-nowrap">{row.sqft ? row.sqft.toLocaleString() : '--'}</td>
                      {activeSystems.slice(0, 7).map((s) => {
                        const cond: Condition = row[s.key] || 'not_inspected';
                        return (
                          <td key={s.key} className={`py-1.5 px-1 text-center font-mono text-xs font-bold ${conditionColor(cond)}`}>
                            {conditionAbbr(cond)}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center text-dl-muted">…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {walkRows.length > 0 && (
          <div className="flex gap-2 flex-wrap border-t border-dl-border pt-4">
            <button
              onClick={handleComputeSummary}
              disabled={computingSummary}
              className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
            >
              {computingSummary ? 'Computing...' : 'Compute Summary'}
            </button>
            <button
              onClick={handleGenerateScope}
              disabled={generatingScope}
              className="bg-dl-forest text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
            >
              {generatingScope ? 'Generating Scope...' : 'Generate Rehab Scope'}
            </button>
            {!generatingScope && (
              <div className="flex items-center gap-2">
                <span className="font-dl-mono text-xs text-dl-muted">ARV $</span>
                <input
                  type="number"
                  value={scopeArv}
                  onChange={(e) => setScopeArv(e.target.value)}
                  placeholder="ARV estimate"
                  className="w-32 border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="mt-5 border border-dl-border p-4">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Walk Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Good', val: summary.units_in_good_condition, color: 'text-green-700' },
                { label: 'Light Rehab', val: summary.units_needing_light_rehab, color: 'text-yellow-700' },
                { label: 'Medium Rehab', val: summary.units_needing_medium_rehab, color: 'text-orange-700' },
                { label: 'Full Replace', val: summary.units_needing_full_rehab, color: 'text-red-700' },
              ].map((item) => (
                <div key={item.label} className="border border-dl-border p-3 text-center">
                  <p className={`font-dl-mono text-xl font-bold ${item.color}`}>{item.val}</p>
                  <p className="font-dl-mono text-xs text-dl-muted">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 font-dl-mono text-xs">
              <div>
                <p className="text-dl-muted">Est. Total Rehab</p>
                <p className="text-dl-navy font-bold">{summary.estimated_total_rehab_cost}</p>
              </div>
              <div>
                <p className="text-dl-muted">Avg Per Unit</p>
                <p className="text-dl-navy font-bold">{summary.estimated_avg_cost_per_unit}</p>
              </div>
              <div>
                <p className="text-dl-muted">Total Deficiencies</p>
                <p className="text-dl-navy font-bold">{summary.total_deficiencies}</p>
              </div>
              <div>
                <p className="text-dl-muted">Critical</p>
                <p className="text-red-700 font-bold">{summary.critical_deficiencies}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'scope' && scopeResult) {
    const strategies = scopeResult.scope?.strategies || {};
    const currentStrategy = strategies[activeStrategyTab] || {};
    const tiers = Object.keys(currentStrategy);

    return (
      <div className="border border-dl-border p-6">
        <div className="mb-5">
          <button
            onClick={() => setView('walk')}
            className="font-dl-mono text-xs text-dl-navy underline mb-1 block"
          >
            Back to Walk
          </button>
          <h2 className="font-dl-serif text-lg text-dl-navy">Rehab Scope</h2>
          <p className="font-dl-mono text-xs text-dl-muted">
            {scopeResult.unitsInspected} of {scopeResult.totalUnits} units inspected
            — ARV ${(scopeResult.arvEstimate || 0).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['flip', 'brrrr', 'hold'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveStrategyTab(s)}
              className={`px-4 py-2 font-dl-mono text-sm border min-h-[40px] uppercase ${
                activeStrategyTab === s ? 'bg-dl-navy text-white border-dl-navy' : 'border-dl-border text-dl-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {tiers.length === 0 ? (
          <p className="font-dl-mono text-sm text-dl-muted">No scope data for this strategy.</p>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => {
              const data = currentStrategy[tier];
              const isRec = tier === scopeResult.scope?.recommended_tier && activeStrategyTab === scopeResult.scope?.recommended_strategy;
              return (
                <div key={tier} className={`border p-4 ${isRec ? 'border-dl-forest' : 'border-dl-border'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-dl-mono text-xs text-dl-muted uppercase">{tier}</p>
                      {isRec && <span className="font-dl-mono text-xs text-dl-forest">Recommended</span>}
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-sm font-bold text-dl-navy">${(data.total || 0).toLocaleString()}</p>
                      <p className="font-dl-mono text-xs text-dl-muted">${(data.sqft_rate || 0).toFixed(2)}/sqft</p>
                    </div>
                  </div>
                  {data.line_items && data.line_items.length > 0 && (
                    <div className="border-t border-dl-border pt-3">
                      <p className="font-dl-mono text-xs text-dl-muted mb-2 uppercase">Line Items</p>
                      <div className="space-y-1">
                        {data.line_items.map((item, i) => (
                          <div key={i} className="flex justify-between font-dl-mono text-xs">
                            <span className="text-dl-text">{item.system} — {item.description}</span>
                            <span className="text-dl-navy font-medium ml-4 shrink-0">${(item.cost || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.mao > 0 && (
                    <p className="font-dl-mono text-xs text-dl-muted mt-3 border-t border-dl-border pt-2">
                      MAO: <span className="text-dl-navy font-bold">${(data.mao || 0).toLocaleString()}</span>
                      {' '}— {data.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {scopeResult.scope?.notes && (
          <div className="mt-4 border border-dl-border p-3">
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Scope Notes</p>
            <p className="font-dl-mono text-xs text-dl-text">{scopeResult.scope.notes}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

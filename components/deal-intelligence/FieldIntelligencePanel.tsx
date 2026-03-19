import { useState, useEffect, useCallback } from 'react';

const SYSTEMS: { key: string; label: string }[] = [
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'bathroom', label: 'Bathroom' },
  { key: 'flooring', label: 'Flooring' },
  { key: 'appliances', label: 'Appliances' },
  { key: 'hvac', label: 'HVAC' },
  { key: 'windows', label: 'Windows' },
  { key: 'paint', label: 'Paint' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'doors', label: 'Doors' },
  { key: 'exterior', label: 'Exterior' },
  { key: 'common_area', label: 'Common Area' },
  { key: 'site_parking', label: 'Site/Parking' },
  { key: 'other', label: 'Other' },
];

type Condition = 'good' | 'light_rehab' | 'medium_rehab' | 'full_replace' | 'not_inspected';

const CONDITIONS: { key: Condition; abbr: string; label: string; activeClass: string; textClass: string }[] = [
  { key: 'good', abbr: 'OK', label: 'Good', activeClass: 'bg-green-700 border-green-700 text-white', textClass: 'text-green-700' },
  { key: 'light_rehab', abbr: 'LT', label: 'Light', activeClass: 'bg-yellow-600 border-yellow-600 text-white', textClass: 'text-yellow-700' },
  { key: 'medium_rehab', abbr: 'MD', label: 'Medium', activeClass: 'bg-orange-600 border-orange-600 text-white', textClass: 'text-orange-700' },
  { key: 'full_replace', abbr: 'FL', label: 'Full Replace', activeClass: 'bg-red-700 border-red-700 text-white', textClass: 'text-red-700' },
];

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

function pctBar(pct: number, colorClass: string) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full bg-gray-100 border border-dl-border h-2 flex-1">
      <div className={`h-full ${colorClass}`} style={{ width: `${w}%` }} />
    </div>
  );
}

type Session = {
  id: string;
  deal_id: string;
  session_name: string;
  status: string;
  total_units: number;
  units_walked: number;
  sampling_confidence_score: string | null;
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

const DEFAULT_UNIT_FORM = (): Record<string, Condition> =>
  Object.fromEntries(SYSTEMS.map((s) => [s.key, 'not_inspected' as Condition]));

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

  const [view, setView] = useState<'sessions' | 'walk' | 'scope'>('sessions');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);

  const [newSession, setNewSession] = useState({ sessionName: '', totalUnits: '', inspectedBy: '' });
  const [creatingSession, setCreatingSession] = useState(false);

  const [unitForm, setUnitForm] = useState({ unitNumber: '', unitType: '', occupancyStatus: 'vacant', generalNotes: '' });
  const [unitConditions, setUnitConditions] = useState<Record<string, Condition>>(DEFAULT_UNIT_FORM());
  const [savingUnit, setSavingUnit] = useState(false);

  const [computingSummary, setComputingSummary] = useState(false);
  const [generatingScope, setGeneratingScope] = useState(false);
  const [scopeArv, setScopeArv] = useState(arvEstimate > 0 ? String(arvEstimate) : '');
  const [activeStrategyTab, setActiveStrategyTab] = useState<'flip' | 'brrrr' | 'hold'>('flip');

  const [error, setError] = useState('');

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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create session'); return; }
      await loadSessions();
      setShowNewSessionForm(false);
      setNewSession({ sessionName: '', totalUnits: '', inspectedBy: '' });
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
    await loadWalkRows(session.id);
  };

  const handleSaveUnit = async () => {
    if (!activeSession || !unitForm.unitNumber) return;
    setSavingUnit(true);
    setError('');
    try {
      const body = {
        unitNumber: unitForm.unitNumber,
        unitType: unitForm.unitType || null,
        occupancyStatus: unitForm.occupancyStatus || null,
        generalNotes: unitForm.generalNotes || null,
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
      setUnitForm({ unitNumber: '', unitType: '', occupancyStatus: 'vacant', generalNotes: '' });
      setUnitConditions(DEFAULT_UNIT_FORM());
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
        body: JSON.stringify({ arvEstimate: Number(scopeArv) || arvEstimate }),
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
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Total Units</label>
                <input
                  type="number"
                  value={newSession.totalUnits}
                  onChange={(e) => setNewSession((p) => ({ ...p, totalUnits: e.target.value }))}
                  min={1}
                  placeholder="12"
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
                    <p className="font-dl-mono text-xs text-dl-muted mt-0.5">
                      {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
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
          </div>
          <div className="text-right">
            <p className="font-dl-mono text-xs text-dl-muted">Progress</p>
            <p className="font-dl-mono text-sm font-bold text-dl-navy">{unitsWalked} / {totalUnits} units ({pctWalked}%)</p>
            <p className="font-dl-mono text-xs text-dl-muted">Sampling confidence: {confidence}%</p>
          </div>
        </div>

        {error && <p className="font-dl-mono text-sm text-red-600 mb-4 border border-red-200 px-3 py-2">{error}</p>}

        <div className="w-full border border-dl-border h-1.5 mb-5 bg-gray-100">
          <div className="h-full bg-dl-navy" style={{ width: `${pctWalked}%` }} />
        </div>

        {!showAddUnit ? (
          <button
            onClick={() => setShowAddUnit(true)}
            className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm mb-5"
          >
            + Add Unit Walk
          </button>
        ) : (
          <div className="border border-dl-border p-4 mb-5">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-2">
              Record Unit Conditions
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Unit #</label>
                <input
                  type="text"
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))}
                  placeholder="101"
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
                  <option>Studio</option>
                  <option>1BR</option>
                  <option>2BR</option>
                  <option>3BR</option>
                  <option>4BR+</option>
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
              {SYSTEMS.map((sys) => (
                <div key={sys.key} className="flex items-center gap-2">
                  <span className="font-dl-mono text-xs text-dl-text w-24 shrink-0">{sys.label}</span>
                  <div className="flex gap-1">
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
              ))}
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
                    {SYSTEMS.slice(0, 8).map((s) => (
                      <th key={s.key} className="text-center py-1.5 px-1 text-dl-muted font-normal whitespace-nowrap">
                        {s.label.slice(0, 4)}
                      </th>
                    ))}
                    <th className="text-center py-1.5 px-1 text-dl-muted font-normal">...</th>
                  </tr>
                </thead>
                <tbody>
                  {walkRows.map((row) => (
                    <tr key={row.id} className="border-b border-dl-border hover:bg-dl-bg">
                      <td className="py-1.5 px-2 font-bold text-dl-navy whitespace-nowrap">{row.unit_number}</td>
                      <td className="py-1.5 px-2 text-dl-muted whitespace-nowrap">{row.unit_type || '--'}</td>
                      {SYSTEMS.slice(0, 8).map((s) => {
                        const c = (row[s.key] || 'not_inspected') as Condition;
                        return (
                          <td key={s.key} className={`py-1.5 px-1 text-center font-bold ${conditionColor(c)}`}>
                            {conditionAbbr(c)}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center text-dl-muted">+6</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {walkRows.length > 0 && (
          <div className="border border-dl-border p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h3 className="font-dl-mono text-xs text-dl-muted uppercase">Inspection Summary</h3>
              <button
                onClick={handleComputeSummary}
                disabled={computingSummary}
                className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-xs disabled:opacity-50"
              >
                {computingSummary ? 'Computing...' : 'Compute Summary'}
              </button>
            </div>

            {summary ? (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Good', val: summary.units_in_good_condition, color: 'text-green-700' },
                    { label: 'Light Rehab', val: summary.units_needing_light_rehab, color: 'text-yellow-700' },
                    { label: 'Medium Rehab', val: summary.units_needing_medium_rehab, color: 'text-orange-600' },
                    { label: 'Full Replace', val: summary.units_needing_full_rehab, color: 'text-red-700' },
                  ].map((item) => (
                    <div key={item.label} className="border border-dl-border p-2 text-center">
                      <p className={`font-dl-mono text-xl font-bold ${item.color}`}>{item.val}</p>
                      <p className="font-dl-mono text-xs text-dl-muted">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">System Issue Distribution</p>
                  <div className="space-y-1.5">
                    {SYSTEMS.slice(0, 8).map((sys) => {
                      const d = summary.system_issue_distribution?.[sys.key] || {};
                      const total = Object.values(d).reduce((a: number, b: any) => a + Number(b), 0);
                      const upgradeCount = (d.light_rehab || 0) + (d.medium_rehab || 0) + (d.full_replace || 0);
                      const upgradePct = total > 0 ? Math.round((upgradeCount / total) * 100) : 0;
                      return (
                        <div key={sys.key} className="flex items-center gap-2">
                          <span className="font-dl-mono text-xs text-dl-text w-20 shrink-0">{sys.label}</span>
                          {pctBar(upgradePct, 'bg-dl-navy')}
                          <span className="font-dl-mono text-xs text-dl-muted w-10 text-right">{upgradePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted">Estimated Total Rehab</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      ${Number(summary.estimated_total_rehab_cost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted">Avg Cost / Unit</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      ${Number(summary.estimated_avg_cost_per_unit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-dl-border pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">ARV Estimate ($) for MAO Calculation</label>
                      <input
                        type="number"
                        value={scopeArv}
                        onChange={(e) => setScopeArv(e.target.value)}
                        placeholder={arvEstimate > 0 ? String(arvEstimate) : 'Enter ARV...'}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleGenerateScope}
                      disabled={generatingScope}
                      className="bg-dl-forest text-white px-5 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      {generatingScope ? 'Generating Scope...' : 'Generate Rehab Scope'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-dl-mono text-xs text-dl-muted">
                Click "Compute Summary" to calculate system condition distributions and estimated rehab cost.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (view === 'scope' && scopeResult) {
    const STRATEGIES: { key: 'flip' | 'brrrr' | 'hold'; label: string }[] = [
      { key: 'flip', label: 'Flip' },
      { key: 'brrrr', label: 'BRRRR' },
      { key: 'hold', label: 'Buy & Hold' },
    ];
    const TIERS: { key: string; label: string }[] = [
      { key: 'cosmetic', label: 'Cosmetic' },
      { key: 'standard', label: 'Standard' },
      { key: 'full_gut', label: 'Full Gut' },
    ];
    const stratData = scopeResult.scope.strategies?.[activeStrategyTab] || {};
    const rec = scopeResult.scope;

    return (
      <div className="border border-dl-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <button
              onClick={() => setView('walk')}
              className="font-dl-mono text-xs text-dl-navy underline mb-1 block"
            >
              Back to Walk
            </button>
            <h2 className="font-dl-serif text-lg text-dl-navy">AI Rehab Scope — {activeSession?.session_name}</h2>
          </div>
          <div className="text-right">
            <p className="font-dl-mono text-xs text-dl-muted">Confidence</p>
            <p className="font-dl-mono text-base font-bold text-dl-navy">
              {Math.round((rec.confidence || 0.7) * 100)}%
            </p>
          </div>
        </div>

        {error && <p className="font-dl-mono text-sm text-red-600 mb-4 border border-red-200 px-3 py-2">{error}</p>}

        <div className="border border-dl-border p-3 mb-5 bg-dl-bg">
          <p className="font-dl-mono text-xs text-dl-muted mb-0.5">AI Observations</p>
          <p className="font-dl-mono text-sm text-dl-text">{rec.notes}</p>
          <div className="flex gap-3 mt-2">
            <span className="font-dl-mono text-xs text-dl-muted">
              Recommended strategy: <span className="text-dl-navy font-bold uppercase">{rec.recommended_strategy}</span>
            </span>
            <span className="font-dl-mono text-xs text-dl-muted">
              Recommended tier: <span className="text-dl-navy font-bold capitalize">{rec.recommended_tier?.replace('_', ' ')}</span>
            </span>
          </div>
        </div>

        <div className="flex border-b border-dl-border mb-4">
          {STRATEGIES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStrategyTab(s.key)}
              className={`px-4 py-2 min-h-[44px] font-dl-mono text-sm border-b-2 -mb-px ${
                activeStrategyTab === s.key
                  ? 'border-dl-navy text-dl-navy'
                  : 'border-transparent text-dl-muted hover:text-dl-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {TIERS.map((tier) => {
            const data = stratData[tier.key];
            if (!data) return null;
            const isRec = tier.key === rec.recommended_tier && activeStrategyTab === rec.recommended_strategy;
            return (
              <div key={tier.key} className={`border p-4 ${isRec ? 'border-dl-navy' : 'border-dl-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-dl-mono text-xs uppercase text-dl-muted">{tier.label}</h4>
                  {isRec && <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-1">Recommended</span>}
                </div>
                <p className="font-dl-mono text-xl font-bold text-dl-navy mb-0.5">
                  ${(data.total || 0).toLocaleString()}
                </p>
                <p className="font-dl-mono text-xs text-dl-muted mb-2">
                  ${data.sqft_rate || '--'}/sqft
                </p>
                <div className="border-t border-dl-border pt-2 mb-2">
                  <p className="font-dl-mono text-xs text-dl-muted mb-0.5">MAO</p>
                  <p className={`font-dl-mono text-base font-bold ${(data.mao || 0) > 0 ? 'text-dl-forest' : 'text-red-700'}`}>
                    {(data.mao || 0) > 0 ? `$${data.mao.toLocaleString()}` : 'Negative — Deal Risk'}
                  </p>
                  {scopeResult.arvEstimate > 0 && (
                    <p className="font-dl-mono text-xs text-dl-muted">
                      ARV × 70% − Rehab = ${Math.round(scopeResult.arvEstimate * 0.7).toLocaleString()} − ${(data.total || 0).toLocaleString()}
                    </p>
                  )}
                </div>
                {data.line_items?.length > 0 && (
                  <div>
                    <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Line Items</p>
                    <div className="space-y-1">
                      {data.line_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between gap-1">
                          <span className="font-dl-mono text-xs text-dl-text flex-1">{item.description}</span>
                          <span className="font-dl-mono text-xs text-dl-navy shrink-0">${(item.cost || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="font-dl-mono text-xs text-dl-muted mt-2 pt-2 border-t border-dl-border italic">{data.rationale}</p>
              </div>
            );
          })}
        </div>

        <div className="border border-dl-border p-4">
          <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Full MAO Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-dl-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-dl-border">
                  <th className="text-left py-1.5 px-2 text-dl-muted font-normal">Strategy</th>
                  {TIERS.map((t) => (
                    <th key={t.key} className="text-right py-1.5 px-2 text-dl-muted font-normal">{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRATEGIES.map((strat) => {
                  const sd = scopeResult.scope.strategies?.[strat.key] || {};
                  return (
                    <tr key={strat.key} className="border-b border-dl-border">
                      <td className="py-1.5 px-2 text-dl-navy font-bold">{strat.label}</td>
                      {TIERS.map((tier) => {
                        const td = sd[tier.key];
                        const mao = td?.mao ?? null;
                        return (
                          <td key={tier.key} className="py-1.5 px-2 text-right">
                            {mao !== null ? (
                              <span className={mao > 0 ? 'text-dl-forest font-bold' : 'text-red-600 font-bold'}>
                                {mao > 0 ? `$${mao.toLocaleString()}` : `(${Math.abs(mao).toLocaleString()})`}
                              </span>
                            ) : '--'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="font-dl-mono text-xs text-dl-muted mt-2">MAO = ARV × 70% − Rehab Cost (NAHB 2024 benchmarks)</p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { setView('walk'); setScopeResult(null); }}
            className="border border-dl-border text-dl-muted px-4 py-2 min-h-[44px] font-dl-mono text-sm"
          >
            Back to Walk
          </button>
          <button
            onClick={() => { setScopeResult(null); setView('walk'); handleGenerateScope(); }}
            disabled={generatingScope}
            className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
          >
            {generatingScope ? 'Regenerating...' : 'Regenerate Scope'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

type Condition = 'good' | 'light_rehab' | 'medium_rehab' | 'full_replace' | 'not_inspected';
type View = 'overview' | 'capture' | 'summary' | 'replicate';
type SyncStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'syncing';

const SFR_SYSTEMS = [
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
  { key: 'other', label: 'Other / Misc', costUnit: 'flat' },
];

const MF_SYSTEMS = [
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
  { key: 'other', label: 'Other / Misc', costUnit: 'flat' },
];

const COND_KEYS: Record<Condition, string> = {
  good: '',
  light_rehab: 'light_rehab',
  medium_rehab: 'medium_rehab',
  full_replace: 'full_replace',
  not_inspected: '',
};

const COND_LABELS: Record<Condition, string> = {
  not_inspected: 'Skip',
  good: 'OK',
  light_rehab: 'Light',
  medium_rehab: 'Medium',
  full_replace: 'Full Rep.',
};

const COND_COLORS: Record<Condition, { bg: string; text: string; border: string }> = {
  not_inspected: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  good: { bg: '#15803d', text: '#fff', border: '#15803d' },
  light_rehab: { bg: '#d97706', text: '#fff', border: '#d97706' },
  medium_rehab: { bg: '#ea580c', text: '#fff', border: '#ea580c' },
  full_replace: { bg: '#b91c1c', text: '#fff', border: '#b91c1c' },
};

const UNIT_CLASSES = [
  { key: 'classic', label: 'Classic' },
  { key: 'partial_upgrade', label: 'Partial Upgrade' },
  { key: 'full_upgrade', label: 'Full Upgrade' },
  { key: 'down_unit', label: 'Down Unit' },
  { key: 'model_unit', label: 'Model Unit' },
  { key: 'common_area', label: 'Common Area' },
];

const OCCUPANCY_OPTIONS = ['vacant', 'occupied', 'notice_to_vacate', 'unknown'];

function makeDefaultConditions(systems: { key: string }[]): Record<string, Condition> {
  return Object.fromEntries(systems.map((s) => [s.key, 'not_inspected' as Condition]));
}

function computeUnitCost(
  conditions: Record<string, Condition>,
  benchmarks: Record<string, Record<string, any>>,
  systems: { key: string; costUnit: string }[],
  sqft = 800,
): number {
  let total = 0;
  for (const sys of systems) {
    const cond = conditions[sys.key];
    if (!cond || cond === 'good' || cond === 'not_inspected') continue;
    const condKey = COND_KEYS[cond];
    if (!condKey) continue;
    const bench = benchmarks?.[sys.key]?.[condKey];
    if (!bench) continue;
    const mid = Number(bench.cost_mid) || 0;
    let cost = mid;
    if (sys.costUnit === 'per_sqft') cost = mid * sqft;
    if (sys.costUnit === 'per_window') cost = mid * 8;
    if (sys.costUnit === 'per_door') cost = mid * 3;
    total += cost;
  }
  return total;
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function computeRecommendation(
  walkRows: any[],
  benchmarks: Record<string, Record<string, any>>,
  systems: { key: string; costUnit: string }[],
  arvEstimate: number,
): { grade: string; label: string; color: string; totalRehab: number; perUnit: number } {
  if (walkRows.length === 0) {
    return { grade: 'N/A', label: 'Insufficient data', color: '#64748b', totalRehab: 0, perUnit: 0 };
  }
  let totalRehab = 0;
  for (const row of walkRows) {
    const conditions: Record<string, Condition> = {};
    for (const sys of systems) conditions[sys.key] = row[sys.key] || 'not_inspected';
    const sqft = Number(row.meta?.sqft) || 800;
    totalRehab += computeUnitCost(conditions, benchmarks, systems, sqft);
  }
  const perUnit = totalRehab / walkRows.length;
  const rehabToArv = arvEstimate > 0 ? totalRehab / arvEstimate : null;

  let fullReplaceCount = 0;
  for (const row of walkRows) {
    for (const sys of systems) {
      if (row[sys.key] === 'full_replace') fullReplaceCount++;
    }
  }
  const fullReplacePct = fullReplaceCount / (walkRows.length * systems.length);

  if (rehabToArv !== null && rehabToArv > 0.35) {
    return { grade: 'WALK', label: 'Walk Away — rehab exceeds 35% of ARV', color: '#b91c1c', totalRehab, perUnit };
  }
  if (fullReplacePct > 0.5) {
    return { grade: 'WALK', label: 'Walk Away — critical system concentration', color: '#b91c1c', totalRehab, perUnit };
  }
  if ((rehabToArv !== null && rehabToArv > 0.25) || fullReplacePct > 0.3) {
    return { grade: 'RENEGO', label: 'Renegotiate — repricing required', color: '#d97706', totalRehab, perUnit };
  }
  return { grade: 'PROCEED', label: 'Proceed — within underwriting parameters', color: '#15803d', totalRehab, perUnit };
}

export default function FieldCapturePage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [session, setSession] = useState<any>(null);
  const [walkRows, setWalkRows] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, Record<string, any>>>({});
  const [view, setView] = useState<View>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const [conditions, setConditions] = useState<Record<string, Condition>>({});
  const [unitNumber, setUnitNumber] = useState('');
  const [unitClass, setUnitClass] = useState('classic');
  const [occupancy, setOccupancy] = useState('vacant');
  const [notes, setNotes] = useState('');
  const [sqft, setSqft] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [replicateSource, setReplicateSource] = useState('');
  const [replicateTargets, setReplicateTargets] = useState('');
  const [replicateOverwrite, setReplicateOverwrite] = useState(false);
  const [replicating, setReplicating] = useState(false);
  const [replicateResult, setReplicateResult] = useState<string>('');

  const [arvInput, setArvInput] = useState('');

  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const DRAFT_KEY = sid ? `FC_DRAFT_${sid}` : null;
  const QUEUE_KEY = sid ? `FC_QUEUE_${sid}` : null;

  const systems = session?.propertyType === 'sfr' ? SFR_SYSTEMS : MF_SYSTEMS;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setVoiceAvailable(!!SR);
    }
  }, []);

  const loadSession = useCallback(async () => {
    if (!sid) return;
    setLoading(true);
    try {
      const [sessRes, walkRes] = await Promise.all([
        fetch(`/api/field-intelligence/sessions?sessionId=${sid}`),
        fetch(`/api/field-intelligence/walks/${sid}`),
      ]);
      if (!sessRes.ok) { setError('Session not found'); return; }
      const sessData = await sessRes.json();
      const walkData = await walkRes.json();
      setSession(sessData);
      setWalkRows(Array.isArray(walkData) ? walkData : []);

      const pt = sessData.propertyType || 'multifamily';
      const bmRes = await fetch(`/api/rehab-costs?property_type=${pt}`);
      const bmData = await bmRes.json();
      setBenchmarks(bmData.benchmarks || {});
    } catch (e: any) {
      setError(e.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sid]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (!QUEUE_KEY) return;
    const processQueue = async () => {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY!) || '[]');
      if (queue.length === 0) return;
      setSyncStatus('syncing');
      const remaining: any[] = [];
      for (const item of queue) {
        try {
          const res = await fetch(`/api/field-intelligence/walks/${sid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!res.ok) remaining.push(item);
        } catch { remaining.push(item); }
      }
      if (remaining.length === 0) {
        localStorage.removeItem(QUEUE_KEY!);
        setSyncStatus('saved');
        await loadSession();
      } else {
        localStorage.setItem(QUEUE_KEY!, JSON.stringify(remaining));
        setSyncStatus('queued');
      }
    };
    window.addEventListener('online', processQueue);
    processQueue();
    return () => window.removeEventListener('online', processQueue);
  }, [sid, QUEUE_KEY, loadSession]);

  const saveDraft = useCallback((data: any) => {
    if (!DRAFT_KEY) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [DRAFT_KEY]);

  const restoreDraft = useCallback(() => {
    if (!DRAFT_KEY) return null;
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
  }, [DRAFT_KEY]);

  const clearDraft = useCallback(() => {
    if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
  }, [DRAFT_KEY]);

  const openNewUnit = useCallback(() => {
    const draft = restoreDraft();
    const defaultConds = makeDefaultConditions(systems);
    if (draft && draft.conditions) {
      setConditions(draft.conditions);
      setUnitNumber(draft.unitNumber || '');
      setUnitClass(draft.unitClass || 'classic');
      setOccupancy(draft.occupancy || 'vacant');
      setNotes(draft.notes || '');
      setSqft(draft.sqft || '');
    } else {
      setConditions(defaultConds);
      setUnitNumber('');
      setUnitClass('classic');
      setOccupancy('vacant');
      setNotes('');
      setSqft('');
    }
    setEditingRowId(null);
    setView('capture');
  }, [systems, restoreDraft]);

  const openEditUnit = useCallback((row: any) => {
    const conds: Record<string, Condition> = {};
    for (const sys of systems) conds[sys.key] = (row[sys.key] || 'not_inspected') as Condition;
    setConditions(conds);
    setUnitNumber(row.unit_number || '');
    setUnitClass(row.unit_type || 'classic');
    setOccupancy(row.occupancy_status || 'vacant');
    setNotes(row.general_notes || '');
    setSqft(row.meta?.sqft ? String(row.meta.sqft) : '');
    setEditingRowId(row.id);
    setView('capture');
  }, [systems]);

  const handleConditionChange = useCallback((sysKey: string, cond: Condition) => {
    setConditions((prev) => {
      const next = { ...prev, [sysKey]: cond };
      saveDraft({ conditions: next, unitNumber, unitClass, occupancy, notes, sqft });
      return next;
    });
  }, [unitNumber, unitClass, occupancy, notes, sqft, saveDraft]);

  const runningCost = computeUnitCost(conditions, benchmarks, systems, Number(sqft) || 800);

  const handleSaveUnit = async () => {
    if (!unitNumber.trim()) return;
    setSaving(true);
    setSyncStatus('saving');
    const body: Record<string, any> = {
      unitNumber: unitNumber.trim(),
      unitType: unitClass,
      occupancyStatus: occupancy,
      generalNotes: notes || null,
      sqft: sqft ? Number(sqft) : null,
      ...conditions,
      commonArea: conditions['common_area'],
      siteParking: conditions['site_parking'],
      laundryRoom: conditions['laundry_room'],
    };

    try {
      let res: Response;
      if (editingRowId) {
        res = await fetch(`/api/field-intelligence/walks/${sid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, unitWalkId: editingRowId }),
        });
      } else {
        res = await fetch(`/api/field-intelligence/walks/${sid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        clearDraft();
        setSyncStatus('saved');
        await loadSession();
        setView('overview');
      } else {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY!) || '[]');
        queue.push(body);
        localStorage.setItem(QUEUE_KEY!, JSON.stringify(queue));
        setSyncStatus('queued');
        clearDraft();
        setView('overview');
      }
    } catch {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY!) || '[]');
      queue.push(body);
      localStorage.setItem(QUEUE_KEY!, JSON.stringify(queue));
      setSyncStatus('queued');
      clearDraft();
      setView('overview');
    } finally {
      setSaving(false);
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNotes((prev) => (prev ? prev + ' ' + transcript : transcript));
      setIsRecording(false);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleReplicate = async () => {
    if (!replicateSource || !replicateTargets.trim()) return;
    setReplicating(true);
    setReplicateResult('');
    try {
      const res = await fetch(`/api/field-intelligence/sessions/${sid}/replicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUnitWalkId: replicateSource,
          targetUnits: replicateTargets,
          overwrite: replicateOverwrite,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplicateResult(`${data.created} units applied. ${data.skipped} skipped.`);
        await loadSession();
      } else {
        setReplicateResult(data.error || 'Replication failed');
      }
    } catch {
      setReplicateResult('Replication failed — network error');
    } finally {
      setReplicating(false);
    }
  };

  const recommendation = computeRecommendation(walkRows, benchmarks, systems, Number(arvInput) || 0);

  const condDist = { good: 0, light_rehab: 0, medium_rehab: 0, full_replace: 0, not_inspected: 0 };
  for (const row of walkRows) {
    for (const sys of systems) {
      const c = (row[sys.key] || 'not_inspected') as Condition;
      condDist[c] = (condDist[c] || 0) + 1;
    }
  }
  const totalSystemEntries = walkRows.length * systems.length;

  const progress = session ? Math.min(100, Math.round(((session.unitsWalked || 0) / (session.totalUnits || 1)) * 100)) : 0;

  const queuedCount = QUEUE_KEY ? JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'ui-serif, Georgia, serif', color: '#1e3a5f' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-serif, Georgia, serif', color: '#b91c1c' }}>
        <p>{error || 'Session not found'}</p>
        <button onClick={() => router.back()} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#1e3a5f', color: '#fff', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  const headerBg = '#1e3a5f';
  const headerText = '#fff';
  const bodyFont = 'ui-serif, Georgia, serif';
  const monoFont = 'ui-monospace, Consolas, monospace';
  const cardBg = '#fff';
  const borderColor = '#cbd5e1';
  const mutedText = '#64748b';

  return (
    <>
      <Head>
        <title>Field Capture — {session.sessionName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: bodyFont, color: '#1e3a5f' }}>

        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: headerBg, color: headerText, padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontFamily: monoFont, opacity: 0.7, letterSpacing: '0.05em' }}>FIELD CAPTURE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2, maxWidth: '55vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.sessionName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {queuedCount > 0 && (
                <span style={{ fontSize: '0.65rem', fontFamily: monoFont, background: '#d97706', color: '#fff', padding: '0.1rem 0.4rem' }}>
                  {queuedCount} QUEUED
                </span>
              )}
              {syncStatus === 'saved' && (
                <span style={{ fontSize: '0.65rem', fontFamily: monoFont, color: '#86efac' }}>SAVED</span>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontFamily: monoFont, fontWeight: 700 }}>{session.unitsWalked}/{session.totalUnits}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>UNITS</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#86efac' }} />
          </div>
          {view !== 'overview' && (
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => setView('overview')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: bodyFont, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
                ← Back to Overview
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto', paddingBottom: '5rem' }}>

          {view === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em' }}>PROPERTY TYPE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'capitalize' }}>{session.propertyType || 'multifamily'}</div>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em' }}>PROGRESS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{progress}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={openNewUnit} style={{ flex: 1, minWidth: '120px', padding: '1rem', background: '#1e3a5f', color: '#fff', border: 'none', fontFamily: bodyFont, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Add Unit
                </button>
                {walkRows.length > 0 && (
                  <>
                    <button onClick={() => setView('replicate')} style={{ flex: 1, minWidth: '120px', padding: '1rem', background: '#fff', color: '#1e3a5f', border: `1.5px solid #1e3a5f`, fontFamily: bodyFont, fontSize: '0.9rem', cursor: 'pointer' }}>
                      Replicate Unit
                    </button>
                    <button onClick={() => setView('summary')} style={{ flex: 1, minWidth: '120px', padding: '1rem', background: '#2d6a4f', color: '#fff', border: 'none', fontFamily: bodyFont, fontSize: '0.9rem', cursor: 'pointer' }}>
                      Summary
                    </button>
                  </>
                )}
              </div>

              {walkRows.length === 0 ? (
                <div style={{ padding: '2rem', background: cardBg, border: `1px solid ${borderColor}`, textAlign: 'center', color: mutedText }}>
                  <p style={{ margin: 0 }}>No units recorded yet. Add your first unit to begin.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {walkRows.map((row) => {
                    const conds: Record<string, Condition> = {};
                    for (const sys of systems) conds[sys.key] = (row[sys.key] || 'not_inspected') as Condition;
                    const unitCost = computeUnitCost(conds, benchmarks, systems, Number(row.meta?.sqft) || 800);
                    const fullCount = systems.filter((s) => conds[s.key] === 'full_replace').length;
                    return (
                      <div key={row.id} onClick={() => openEditUnit(row)} style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Unit {row.unit_number}</div>
                          <div style={{ fontSize: '0.75rem', color: mutedText, fontFamily: monoFont }}>
                            {row.unit_type || 'classic'} · {row.occupancy_status || ''}
                          </div>
                          {fullCount > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontFamily: monoFont, marginTop: '0.2rem' }}>{fullCount} full replace</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: monoFont, fontWeight: 700, fontSize: '0.95rem' }}>{fmt(unitCost)}</div>
                          <div style={{ fontSize: '0.65rem', color: mutedText, fontFamily: monoFont }}>est. rehab</div>
                          <div style={{ fontSize: '0.7rem', color: '#1e3a5f', marginTop: '0.2rem' }}>Edit →</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === 'capture' && (
            <div>
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>UNIT NUMBER / ID *</label>
                  <input value={unitNumber} onChange={(e) => { setUnitNumber(e.target.value); saveDraft({ conditions, unitNumber: e.target.value, unitClass, occupancy, notes, sqft }); }}
                    placeholder="e.g. 101, A1, 3B"
                    style={{ width: '100%', padding: '0.75rem', border: `1.5px solid ${borderColor}`, fontFamily: bodyFont, fontSize: '1.1rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>UNIT CLASS</label>
                    <select value={unitClass} onChange={(e) => setUnitClass(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: `1.5px solid ${borderColor}`, fontFamily: bodyFont, fontSize: '0.9rem', background: '#fff' }}>
                      {UNIT_CLASSES.map((uc) => <option key={uc.key} value={uc.key}>{uc.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>OCCUPANCY</label>
                    <select value={occupancy} onChange={(e) => setOccupancy(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: `1.5px solid ${borderColor}`, fontFamily: bodyFont, fontSize: '0.9rem', background: '#fff' }}>
                      {OCCUPANCY_OPTIONS.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>APPROX. SQFT (for cost calculation)</label>
                  <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="e.g. 850" style={{ width: '100%', padding: '0.6rem', border: `1.5px solid ${borderColor}`, fontFamily: monoFont, fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ background: '#1e3a5f', color: '#fff', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontFamily: monoFont, opacity: 0.8 }}>RUNNING REHAB ESTIMATE</div>
                <div style={{ fontSize: '1.3rem', fontFamily: monoFont, fontWeight: 700 }}>{fmt(runningCost)}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {systems.map((sys) => {
                  const cond = conditions[sys.key] || 'not_inspected';
                  const condKey = COND_KEYS[cond];
                  const bench = condKey ? benchmarks?.[sys.key]?.[condKey] : null;
                  const mid = bench ? Number(bench.cost_mid) : null;
                  let costDisplay = '';
                  if (mid !== null) {
                    if (sys.costUnit === 'per_sqft') costDisplay = `~${fmt(mid * (Number(sqft) || 800))}`;
                    else if (sys.costUnit === 'per_window') costDisplay = `~${fmt(mid * 8)}`;
                    else if (sys.costUnit === 'per_door') costDisplay = `~${fmt(mid * 3)}`;
                    else costDisplay = `~${fmt(mid)}`;
                  }
                  return (
                    <div key={sys.key} style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{sys.label}</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: monoFont, color: cond !== 'good' && cond !== 'not_inspected' ? '#1e3a5f' : mutedText, fontWeight: 600 }}>{costDisplay}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {(['not_inspected', 'good', 'light_rehab', 'medium_rehab', 'full_replace'] as Condition[]).map((c) => {
                          const active = cond === c;
                          const col = COND_COLORS[c];
                          return (
                            <button key={c} onClick={() => handleConditionChange(sys.key, c)}
                              style={{
                                flex: 1, padding: '0.55rem 0.2rem', fontSize: '0.7rem', fontFamily: monoFont,
                                fontWeight: active ? 700 : 400, cursor: 'pointer', border: `1.5px solid ${active ? col.border : borderColor}`,
                                background: active ? col.bg : '#f8fafc', color: active ? col.text : mutedText,
                                minHeight: '44px',
                              }}>
                              {COND_LABELS[c]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em' }}>FIELD NOTES</label>
                  {voiceAvailable && (
                    <button onClick={isRecording ? stopVoice : startVoice} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontFamily: monoFont, background: isRecording ? '#b91c1c' : '#1e3a5f', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      {isRecording ? '■ Stop' : '🎤 Voice'}
                    </button>
                  )}
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations, access issues, special conditions..." rows={3}
                  style={{ width: '100%', padding: '0.6rem', border: `1.5px solid ${borderColor}`, fontFamily: bodyFont, fontSize: '0.9rem', resize: 'none', boxSizing: 'border-box' }} />
                {isRecording && <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontFamily: monoFont, marginTop: '0.25rem' }}>Recording... speak now</div>}
              </div>

              <div style={{ position: 'sticky', bottom: 0, background: '#f8fafc', padding: '0.75rem 0', borderTop: `1px solid ${borderColor}` }}>
                <button onClick={handleSaveUnit} disabled={saving || !unitNumber.trim()}
                  style={{ width: '100%', padding: '1rem', background: unitNumber.trim() ? '#1e3a5f' : '#94a3b8', color: '#fff', border: 'none', fontFamily: bodyFont, fontSize: '1rem', fontWeight: 700, cursor: unitNumber.trim() ? 'pointer' : 'not-allowed' }}>
                  {saving ? 'Saving...' : editingRowId ? 'Update Unit' : 'Save Unit'}
                </button>
                {!unitNumber.trim() && <div style={{ fontSize: '0.7rem', color: mutedText, fontFamily: monoFont, textAlign: 'center', marginTop: '0.35rem' }}>Unit number is required</div>}
              </div>
            </div>
          )}

          {view === 'replicate' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Replicate Unit Conditions</h2>
              <p style={{ fontSize: '0.85rem', color: mutedText, marginBottom: '1rem' }}>
                Copy all system conditions from one unit to multiple others. Useful for similar floorplans or when a group of units is in the same condition.
              </p>

              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>SOURCE UNIT (copy from)</label>
                <select value={replicateSource} onChange={(e) => setReplicateSource(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: `1.5px solid ${borderColor}`, fontFamily: bodyFont, fontSize: '0.95rem', background: '#fff' }}>
                  <option value="">Select a completed unit...</option>
                  {walkRows.map((row) => <option key={row.id} value={row.id}>Unit {row.unit_number} ({row.unit_type || 'classic'})</option>)}
                </select>
              </div>

              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>TARGET UNITS (copy to)</label>
                <input value={replicateTargets} onChange={(e) => setReplicateTargets(e.target.value)} placeholder="e.g. 102-108, 110, 112, 201-206"
                  style={{ width: '100%', padding: '0.75rem', border: `1.5px solid ${borderColor}`, fontFamily: monoFont, fontSize: '0.9rem', boxSizing: 'border-box' }} />
                <div style={{ fontSize: '0.7rem', color: mutedText, marginTop: '0.25rem' }}>Use ranges (102-108) and commas (102,105,108)</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', background: cardBg, border: `1px solid ${borderColor}` }}>
                <input type="checkbox" id="overwrite" checked={replicateOverwrite} onChange={(e) => setReplicateOverwrite(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <label htmlFor="overwrite" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Overwrite existing unit data</label>
              </div>

              {replicateResult && (
                <div style={{ padding: '0.75rem', background: replicateResult.includes('failed') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${replicateResult.includes('failed') ? '#fca5a5' : '#86efac'}`, marginBottom: '0.75rem', fontSize: '0.875rem', fontFamily: monoFont }}>
                  {replicateResult}
                </div>
              )}

              <button onClick={handleReplicate} disabled={replicating || !replicateSource || !replicateTargets.trim()}
                style={{ width: '100%', padding: '1rem', background: replicateSource && replicateTargets.trim() ? '#1e3a5f' : '#94a3b8', color: '#fff', border: 'none', fontFamily: bodyFont, fontSize: '1rem', fontWeight: 700, cursor: replicateSource && replicateTargets.trim() ? 'pointer' : 'not-allowed' }}>
                {replicating ? 'Applying...' : 'Apply to Target Units'}
              </button>
            </div>
          )}

          {view === 'summary' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Walk Session Summary</h2>

              <div style={{ background: recommendation.color, color: '#fff', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontFamily: monoFont, opacity: 0.85, letterSpacing: '0.1em' }}>RECOMMENDATION</div>
                <div style={{ fontSize: '1.75rem', fontFamily: monoFont, fontWeight: 900, letterSpacing: '0.05em' }}>{recommendation.grade}</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{recommendation.label}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText }}>TOTAL EST. REHAB</div>
                  <div style={{ fontSize: '1.1rem', fontFamily: monoFont, fontWeight: 700 }}>{fmt(recommendation.totalRehab)}</div>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText }}>PER UNIT (AVG)</div>
                  <div style={{ fontSize: '1.1rem', fontFamily: monoFont, fontWeight: 700 }}>{fmt(recommendation.perUnit)}</div>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText }}>UNITS WALKED</div>
                  <div style={{ fontSize: '1.1rem', fontFamily: monoFont, fontWeight: 700 }}>{session.unitsWalked}/{session.totalUnits}</div>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: monoFont, color: mutedText }}>CONFIDENCE</div>
                  <div style={{ fontSize: '1.1rem', fontFamily: monoFont, fontWeight: 700 }}>{Math.round((session.samplingConfidenceScore || 0) * 100)}%</div>
                </div>
              </div>

              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, marginBottom: '0.5rem' }}>CONDITION DISTRIBUTION ({totalSystemEntries} system entries)</div>
                {([['good', 'Good'], ['light_rehab', 'Light Rehab'], ['medium_rehab', 'Medium Rehab'], ['full_replace', 'Full Replace'], ['not_inspected', 'Not Inspected']] as [Condition, string][]).map(([k, label]) => {
                  const count = condDist[k] || 0;
                  const pct = totalSystemEntries > 0 ? Math.round((count / totalSystemEntries) * 100) : 0;
                  const col = COND_COLORS[k];
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <div style={{ fontSize: '0.8rem', width: '90px', color: '#1e3a5f' }}>{label}</div>
                      <div style={{ flex: 1, height: '12px', background: '#f1f5f9' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: col.bg }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: monoFont, width: '36px', textAlign: 'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontFamily: monoFont, color: mutedText, letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>ARV ESTIMATE (for risk grade)</label>
                <input type="number" value={arvInput} onChange={(e) => setArvInput(e.target.value)} placeholder="e.g. 1200000" style={{ width: '100%', padding: '0.75rem', border: `1.5px solid ${borderColor}`, fontFamily: monoFont, fontSize: '0.95rem', boxSizing: 'border-box' }} />
                <div style={{ fontSize: '0.7rem', color: mutedText, marginTop: '0.25rem' }}>Enter to calculate rehab-to-ARV ratio and update recommendation.</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={`/deal-intelligence/deal/${session.dealId}?tab=fieldIntelligence`} style={{ flex: 1, display: 'block', padding: '1rem', background: '#1e3a5f', color: '#fff', textDecoration: 'none', textAlign: 'center', fontFamily: bodyFont, fontWeight: 700, fontSize: '0.9rem' }}>
                  Open in Deal Workspace
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

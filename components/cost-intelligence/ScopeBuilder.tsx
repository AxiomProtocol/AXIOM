import { useState } from 'react';
import type { PropertyType, ConditionLevel, CostUnit } from '../../lib/cost-intelligence/types';

interface ScopeRow {
  id?: string;
  trade: string;
  itemName: string;
  condition: ConditionLevel;
  repairOrReplace: 'repair' | 'replace';
  quantity: number;
  unit: CostUnit;
  appliesToAllUnits: boolean;
  areaLabel?: string;
  scopeNote?: string;
  mappedBenchmarkId?: string;
  mappingConfidence?: number;
}

interface Props {
  estimateId: string;
  scopeItems: ScopeRow[];
  propertyType: PropertyType;
  onScopeChanged: () => void;
  disabled?: boolean;
}

const TRADES = [
  'Carpentry/Finishes', 'Flooring', 'Painting', 'Plumbing', 'Electrical',
  'Mechanical/HVAC', 'Mechanical/Appliances', 'Windows/Doors', 'Exterior/Roofing',
  'Structural', 'Site Work', 'Finishes', 'General',
];

const CONDITION_OPTIONS: { value: ConditionLevel; label: string }[] = [
  { value: 'light_rehab', label: 'Light — cosmetic, minor' },
  { value: 'medium_rehab', label: 'Medium — partial replace' },
  { value: 'full_replace', label: 'Full — gut / replace' },
];

const UNIT_OPTIONS: CostUnit[] = ['per_unit', 'per_sqft', 'flat', 'each', 'per_door', 'per_window', 'per_lf'];

const COMMON_ITEMS = [
  { trade: 'Painting', itemName: 'Interior paint full', condition: 'light_rehab' as ConditionLevel },
  { trade: 'Flooring', itemName: 'Flooring replace', condition: 'medium_rehab' as ConditionLevel },
  { trade: 'Carpentry/Finishes', itemName: 'Kitchen medium rehab', condition: 'medium_rehab' as ConditionLevel },
  { trade: 'Plumbing/Finishes', itemName: 'Bathroom medium rehab', condition: 'medium_rehab' as ConditionLevel },
  { trade: 'Mechanical/Appliances', itemName: 'Appliances replace', condition: 'medium_rehab' as ConditionLevel },
  { trade: 'Mechanical/HVAC', itemName: 'HVAC full system replace', condition: 'full_replace' as ConditionLevel },
  { trade: 'Plumbing', itemName: 'Plumbing full replace', condition: 'full_replace' as ConditionLevel },
  { trade: 'Electrical', itemName: 'Electrical full rewire', condition: 'full_replace' as ConditionLevel },
  { trade: 'Windows/Doors', itemName: 'Windows full replace', condition: 'full_replace' as ConditionLevel },
  { trade: 'Exterior/Roofing', itemName: 'Roof full replace', condition: 'full_replace' as ConditionLevel },
];

const BLANK_ROW = (): Omit<ScopeRow, 'id'> => ({
  trade: 'General',
  itemName: '',
  condition: 'medium_rehab',
  repairOrReplace: 'replace',
  quantity: 1,
  unit: 'per_unit',
  appliesToAllUnits: true,
  areaLabel: '',
  scopeNote: '',
});

export default function ScopeBuilder({ estimateId, scopeItems, propertyType, onScopeChanged, disabled }: Props) {
  const [form, setForm] = useState(BLANK_ROW());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  async function handleAdd() {
    if (!form.itemName || !form.trade) { setError('Trade and item name are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/cost-intelligence/estimates/${estimateId}/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, autoMap: true }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setForm(BLANK_ROW());
      onScopeChanged();
    } catch { setError('Failed to add item'); }
    finally { setSaving(false); }
  }

  async function handleDelete(scopeItemId: string) {
    setDeleting(scopeItemId);
    try {
      await fetch(`/api/cost-intelligence/estimates/${estimateId}/scope?scopeItemId=${scopeItemId}`, {
        method: 'DELETE',
      });
      onScopeChanged();
    } catch { }
    finally { setDeleting(null); }
  }

  async function handleQuickAdd(item: typeof COMMON_ITEMS[number]) {
    setSaving(true); setError('');
    try {
      await fetch(`/api/cost-intelligence/estimates/${estimateId}/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade: item.trade,
          itemName: item.itemName,
          condition: item.condition,
          repairOrReplace: 'replace',
          quantity: 1,
          unit: 'per_unit',
          appliesToAllUnits: true,
          wasteFactor: 0.05,
          contingencyFactor: 0.10,
          autoMap: true,
        }),
      });
      onScopeChanged();
    } catch { }
    finally { setSaving(false); }
  }

  const confColor = (c?: number) =>
    !c ? 'text-dl-muted' : c >= 0.8 ? 'text-dl-forest' : c >= 0.5 ? 'text-yellow-700' : 'text-red-600';

  return (
    <div className="space-y-6">
      {scopeItems.length > 0 && (
        <div>
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Scope Items ({scopeItems.length})</p>
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full font-dl-mono text-xs">
              <thead>
                <tr className="border-b border-dl-border bg-gray-50">
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Trade</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Item</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Condition</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Qty</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">All Units</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Map Conf</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {scopeItems.map((s, i) => (
                  <tr key={s.id || i} className="border-b border-dl-border last:border-0">
                    <td className="px-3 py-2 text-dl-muted">{s.trade}</td>
                    <td className="px-3 py-2 text-dl-text font-bold">{s.itemName}</td>
                    <td className="px-3 py-2 text-dl-muted">{(s.condition || '').replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-dl-text">{s.quantity} {s.unit}</td>
                    <td className="px-3 py-2 text-dl-muted">{s.appliesToAllUnits ? 'Yes' : 'No'}</td>
                    <td className={`px-3 py-2 ${confColor(s.mappingConfidence)}`}>
                      {s.mappingConfidence != null ? `${Math.round(s.mappingConfidence * 100)}%` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => s.id && handleDelete(s.id)}
                        disabled={deleting === s.id || disabled}
                        className="text-red-600 hover:text-red-800 disabled:opacity-40"
                      >
                        {deleting === s.id ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border border-dl-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-dl-mono text-xs text-dl-muted uppercase">Add Scope Item</p>
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="font-dl-mono text-xs text-dl-navy underline"
          >
            {showQuickAdd ? 'Hide Quick-Add' : 'Quick-Add Common Items'}
          </button>
        </div>

        {showQuickAdd && (
          <div className="mb-4 border border-dl-border p-3 bg-gray-50">
            <p className="font-dl-mono text-xs text-dl-muted mb-2">Click to add common scope items instantly:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_ITEMS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAdd(item)}
                  disabled={saving || disabled}
                  className="border border-dl-border px-2 py-1 font-dl-mono text-xs text-dl-navy hover:border-dl-navy disabled:opacity-40"
                >
                  {item.itemName.replace(' full', '').replace(' medium', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Trade *</label>
            <select
              value={form.trade}
              onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
              disabled={disabled}
            >
              {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Item Name *</label>
            <input
              type="text"
              value={form.itemName}
              onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
              placeholder="e.g. Kitchen medium rehab"
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value as ConditionLevel }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
              disabled={disabled}
            >
              {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Scope</label>
            <select
              value={form.repairOrReplace}
              onChange={e => setForm(f => ({ ...f, repairOrReplace: e.target.value as 'repair' | 'replace' }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
              disabled={disabled}
            >
              <option value="repair">Repair</option>
              <option value="replace">Replace</option>
            </select>
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Qty</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value as CostUnit }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
              disabled={disabled}
            >
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">All Units?</label>
            <select
              value={form.appliesToAllUnits ? 'yes' : 'no'}
              onChange={e => setForm(f => ({ ...f, appliesToAllUnits: e.target.value === 'yes' }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
              disabled={disabled}
            >
              <option value="yes">Yes — all units</option>
              <option value="no">No — specific unit</option>
            </select>
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Area Label</label>
            <input
              type="text"
              value={form.areaLabel || ''}
              onChange={e => setForm(f => ({ ...f, areaLabel: e.target.value }))}
              placeholder="Unit A, Common, etc."
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              disabled={disabled}
            />
          </div>
        </div>

        {error && <p className="font-dl-mono text-xs text-red-600 mb-2">{error}</p>}

        <button
          onClick={handleAdd}
          disabled={saving || disabled}
          className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-xs disabled:opacity-40"
        >
          {saving ? 'Adding...' : '+ Add Scope Item'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

interface ChecklistItem {
  id: string;
  checklist_id: string;
  category: string;
  name: string;
  status: 'notStarted' | 'inProgress' | 'blocked' | 'complete';
  priority: string;
  owner: string | null;
  notes: string | null;
  evidence_links: string[] | null;
  completed_at: string | null;
  sort_order: number;
}

interface Progress {
  total: number;
  complete: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
  percentComplete: number;
}

interface Props {
  dealId: string;
}

const STATUS_OPTIONS = [
  { value: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'inProgress', label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-50 text-red-700' },
  { value: 'complete', label: 'Complete', color: 'bg-green-50 text-green-700' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-gray-500',
};

const CATEGORIES = [
  'title',
  'physical condition',
  'financial review',
  'legal/title',
  'market validation',
  'rent validation',
  'zoning/use',
  'insurance/taxes',
  'financing readiness',
  'exit readiness',
];

export default function DueDiligencePanel({ dealId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/due-diligence/${dealId}`);
      const json = await res.json();
      if (json.data) {
        setHasChecklist(!!json.data.checklist);
        setItems(json.data.items || []);
        setProgress(json.data.progress || null);
      }
    } catch (err) {
      console.error('Failed to load DD checklist:', err);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/due-diligence/${dealId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.data) {
        setHasChecklist(true);
        setItems(json.data.items || []);
        setProgress(json.data.progress || null);
      }
    } catch (err) {
      console.error('Failed to create checklist:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setSaving(itemId);
    try {
      const res = await fetch(`/api/due-diligence/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadChecklist();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveDetails = async (itemId: string) => {
    setSaving(itemId);
    try {
      const res = await fetch(`/api/due-diligence/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes, owner: editOwner }),
      });
      if (res.ok) {
        await loadChecklist();
      }
    } catch (err) {
      console.error('Failed to save details:', err);
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (item: ChecklistItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      setEditNotes(item.notes || '');
      setEditOwner(item.owner || '');
    }
  };

  const filteredItems = statusFilter === 'all'
    ? items
    : items.filter(i => i.status === statusFilter);

  const groupedItems: Record<string, ChecklistItem[]> = {};
  for (const item of filteredItems) {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  }

  const sortedCategories = CATEGORIES.filter(c => groupedItems[c]);
  const otherCategories = Object.keys(groupedItems).filter(c => !CATEGORIES.includes(c));
  const allCategories = [...sortedCategories, ...otherCategories];

  if (loading) {
    return (
      <div className="border border-dl-border p-6">
        <p className="text-dl-muted font-dl-mono text-sm">Loading due diligence checklist...</p>
      </div>
    );
  }

  if (!hasChecklist) {
    return (
      <div className="border border-dl-border p-6 text-center">
        <h2 className="font-dl-serif text-lg text-dl-navy mb-2">Due Diligence Checklist</h2>
        <p className="text-dl-muted font-dl-mono text-sm mb-4">
          Initialize a due diligence checklist for this deal with standard items covering title, physical condition, financial review, legal, market validation, and more.
        </p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Initialize DD Checklist'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-dl-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-dl-serif text-lg text-dl-navy">Due Diligence Progress</h2>
          {progress && (
            <span className="font-dl-mono text-sm text-dl-navy font-bold">{progress.percentComplete}%</span>
          )}
        </div>

        {progress && (
          <>
            <div className="w-full h-3 bg-gray-100 border border-dl-border mb-3">
              <div
                className="h-full bg-dl-navy transition-all duration-300"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <span className="block font-dl-mono text-lg text-gray-500">{progress.notStarted}</span>
                <span className="block font-dl-mono text-xs text-dl-muted uppercase">Not Started</span>
              </div>
              <div className="text-center">
                <span className="block font-dl-mono text-lg text-blue-600">{progress.inProgress}</span>
                <span className="block font-dl-mono text-xs text-dl-muted uppercase">In Progress</span>
              </div>
              <div className="text-center">
                <span className="block font-dl-mono text-lg text-red-600">{progress.blocked}</span>
                <span className="block font-dl-mono text-xs text-dl-muted uppercase">Blocked</span>
              </div>
              <div className="text-center">
                <span className="block font-dl-mono text-lg text-green-600">{progress.complete}</span>
                <span className="block font-dl-mono text-xs text-dl-muted uppercase">Complete</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 font-dl-mono text-xs border ${statusFilter === 'all' ? 'border-dl-navy text-dl-navy bg-blue-50' : 'border-dl-border text-dl-muted'}`}
        >
          All ({items.length})
        </button>
        {STATUS_OPTIONS.map(opt => {
          const count = items.filter(i => i.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 font-dl-mono text-xs border ${statusFilter === opt.value ? 'border-dl-navy text-dl-navy bg-blue-50' : 'border-dl-border text-dl-muted'}`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {allCategories.map(category => (
        <div key={category} className="border border-dl-border">
          <div className="px-4 py-2 bg-dl-bg border-b border-dl-border">
            <h3 className="font-dl-mono text-xs text-dl-muted uppercase tracking-wide">{category}</h3>
          </div>
          <div>
            {groupedItems[category].map(item => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === item.status);
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="border-b border-dl-border last:border-b-0">
                  <div
                    className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(item)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`font-dl-mono text-xs ${PRIORITY_COLORS[item.priority] || 'text-gray-500'}`}>
                        {item.priority === 'high' ? '!' : item.priority === 'medium' ? '-' : '.'}
                      </span>
                      <span className="font-dl-mono text-sm text-dl-text truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {item.owner && (
                        <span className="font-dl-mono text-xs text-dl-muted">{item.owner}</span>
                      )}
                      <select
                        value={item.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(item.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={saving === item.id}
                        className={`px-2 py-0.5 font-dl-mono text-xs border border-dl-border ${statusOpt?.color || ''} focus:outline-none disabled:opacity-50`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 py-3 bg-dl-bg border-t border-dl-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Owner</label>
                          <input
                            type="text"
                            value={editOwner}
                            onChange={(e) => setEditOwner(e.target.value)}
                            placeholder="Assign owner..."
                            className="w-full px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white border border-dl-border focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">
                            {item.completed_at ? `Completed: ${new Date(item.completed_at).toLocaleDateString()}` : 'Not yet completed'}
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add notes..."
                          rows={3}
                          className="w-full px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white border border-dl-border focus:outline-none resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveDetails(item.id)}
                        disabled={saving === item.id}
                        className="border border-dl-navy text-dl-navy px-4 py-1 font-dl-mono text-xs disabled:opacity-50"
                      >
                        {saving === item.id ? 'Saving...' : 'Save Details'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

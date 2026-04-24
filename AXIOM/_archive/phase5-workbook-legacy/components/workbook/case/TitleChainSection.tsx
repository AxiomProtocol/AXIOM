import React, { useState, useEffect, useCallback } from 'react';

interface TitleChainSectionProps {
  caseId: string;
}

interface TitleEvent {
  id: string;
  date: string;
  type: 'patent' | 'deed' | 'inheritance' | 'probate' | 'tax-sale' | 'unknown';
  grantor: string;
  grantee: string;
  description: string;
  documentRef: string;
  verified: boolean;
  notes: string;
}

const EVENT_TYPES = [
  { id: 'patent', name: 'Land Patent', icon: '📜', color: 'bg-amber-100 border-amber-300' },
  { id: 'deed', name: 'Deed Transfer', icon: '📄', color: 'bg-blue-100 border-blue-300' },
  { id: 'inheritance', name: 'Inheritance', icon: '👨‍👩‍👧', color: 'bg-green-100 border-green-300' },
  { id: 'probate', name: 'Probate', icon: '⚖️', color: 'bg-purple-100 border-purple-300' },
  { id: 'tax-sale', name: 'Tax Sale', icon: '🏛️', color: 'bg-red-100 border-red-300' },
  { id: 'unknown', name: 'Unknown Gap', icon: '❓', color: 'bg-gray-100 border-gray-300' },
];

export default function TitleChainSection({ caseId }: TitleChainSectionProps) {
  const [events, setEvents] = useState<TitleEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<TitleEvent>>({
    date: '',
    type: 'deed',
    grantor: '',
    grantee: '',
    description: '',
    documentRef: '',
    verified: false,
    notes: '',
  });

  const loadEvents = useCallback(async () => {
    if (!caseId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/workbook/title-chain?caseId=${caseId}`);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error('Failed to load title chain:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/workbook/title-chain?caseId=${caseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
        const json = await res.json();
        if (json.success) {
          setEvents(events.map(ev => ev.id === editingId ? json.data : ev).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ));
        }
        setEditingId(null);
      } else {
        const res = await fetch(`/api/workbook/title-chain?caseId=${caseId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setEvents([...events, json.data].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ));
        }
      }

      setFormData({
        date: '',
        type: 'deed',
        grantor: '',
        grantee: '',
        description: '',
        documentRef: '',
        verified: false,
        notes: '',
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to save event:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event: TitleEvent) => {
    setFormData(event);
    setEditingId(event.id);
    setShowAddForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Remove this event from the title chain?')) return;
    
    try {
      await fetch(`/api/workbook/title-chain?caseId=${caseId}&eventId=${eventId}`, {
        method: 'DELETE',
      });
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete. Please try again.');
    }
  };

  const findGaps = () => {
    const gaps: { after: TitleEvent; issue: string }[] = [];
    
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];
      
      if (current.grantee !== next.grantor) {
        gaps.push({
          after: current,
          issue: `Grantee "${current.grantee}" doesn't match next grantor "${next.grantor}"`,
        });
      }
    }
    
    return gaps;
  };

  const gaps = findGaps();
  const hasGaps = gaps.length > 0;

  const getEventStyle = (type: string) => {
    return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[5];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasGaps && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-medium text-red-800 flex items-center gap-2">
            <span>⚠️</span> Chain of Title Issues Detected
          </h3>
          <ul className="mt-2 space-y-1">
            {gaps.map((gap, i) => (
              <li key={i} className="text-sm text-red-700">
                After {gap.after.date}: {gap.issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ownership History</h2>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
              setFormData({
                date: '',
                type: 'deed',
                grantor: '',
                grantee: '',
                description: '',
                documentRef: '',
                verified: false,
                notes: '',
              });
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            + Add Event
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TitleEvent['type'] })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grantor (From)</label>
                <input
                  type="text"
                  value={formData.grantor}
                  onChange={(e) => setFormData({ ...formData, grantor: e.target.value })}
                  placeholder="Previous owner / US Government"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grantee (To)</label>
                <input
                  type="text"
                  value={formData.grantee}
                  onChange={(e) => setFormData({ ...formData, grantee: e.target.value })}
                  placeholder="New owner"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="T15N R5E Section 23 NW 1/4"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Reference</label>
                <input
                  type="text"
                  value={formData.documentRef}
                  onChange={(e) => setFormData({ ...formData, documentRef: e.target.value })}
                  placeholder="Book 12, Page 345"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details about this transfer..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Document verified</span>
              </label>

              <div className="flex-1"></div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Event'}
              </button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔗</div>
            <p>No title events recorded yet.</p>
            <p className="text-sm mt-1">Start by adding the original land patent or earliest known deed.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-4">
              {events.map((event) => {
                const style = getEventStyle(event.type);
                const hasGap = gaps.some(g => g.after.id === event.id);
                
                return (
                  <div key={event.id}>
                    <div className={`relative pl-14 ${style.color} border rounded-lg p-4`}>
                      <div className={`absolute left-4 w-5 h-5 rounded-full ${style.color} border-2 flex items-center justify-center text-xs`}>
                        {style.icon}
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm px-2 py-0.5 bg-white/50 rounded">
                              {style.name}
                            </span>
                            {event.verified && (
                              <span className="text-green-600 text-sm">✓ Verified</span>
                            )}
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">From:</span>{' '}
                            <span className="font-medium">{event.grantor}</span>
                            <span className="mx-2">→</span>
                            <span className="text-gray-600">To:</span>{' '}
                            <span className="font-medium">{event.grantee}</span>
                          </div>
                          
                          {event.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              <strong>Property:</strong> {event.description}
                            </div>
                          )}
                          
                          {event.documentRef && (
                            <div className="text-sm text-gray-500 mt-1">
                              <strong>Ref:</strong> {event.documentRef}
                            </div>
                          )}
                          
                          {event.notes && (
                            <div className="text-sm text-gray-500 mt-1 italic">
                              {event.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {hasGap && (
                      <div className="relative pl-14 my-2">
                        <div className="absolute left-4 w-5 h-5 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center text-xs">
                          ⚠️
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          <strong>Gap detected:</strong> {gaps.find(g => g.after.id === event.id)?.issue}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chain of Title Tips</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-medium text-indigo-900">Start at the Beginning</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Begin with the original land patent from the federal government (or state for TX). 
              Search GLO records at glorecords.blm.gov.
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Track Every Transfer</h3>
            <p className="text-sm text-blue-700 mt-1">
              Each deed should show grantor (seller) matching previous grantee (buyer). 
              Gaps indicate missing documents.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900">Don't Forget Probate</h3>
            <p className="text-sm text-purple-700 mt-1">
              When someone dies owning land, search probate records. If no will, 
              the land passed by intestate succession.
            </p>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg">
            <h3 className="font-medium text-amber-900">Watch for Tax Sales</h3>
            <p className="text-sm text-amber-700 mt-1">
              Unpaid property taxes can result in tax sales. Check county tax 
              records and sheriff's deeds for breaks in the chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

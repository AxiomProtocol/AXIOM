import React, { useState, useEffect } from 'react';

interface TimelineSectionProps {
  caseId: string;
}

interface TimelineEvent {
  id: string;
  year: number;
  type: 'birth' | 'death' | 'marriage' | 'land_acquired' | 'land_sold' | 'land_inherited' | 'tax_sale' | 'census' | 'probate' | 'historical';
  title: string;
  description: string;
  personId?: number;
  personName?: string;
  source?: string;
}

interface Person {
  id: number;
  full_name: string;
  birth_year?: string;
  death_year?: string;
}

const HISTORICAL_EVENTS: TimelineEvent[] = [
  { id: 'h1', year: 1863, type: 'historical', title: 'Emancipation Proclamation', description: 'Freed enslaved people in Confederate states' },
  { id: 'h2', year: 1865, type: 'historical', title: 'Civil War Ends / 13th Amendment', description: 'Slavery abolished nationwide' },
  { id: 'h3', year: 1865, type: 'historical', title: "Freedmen's Bureau Established", description: 'Created to help formerly enslaved people' },
  { id: 'h4', year: 1866, type: 'historical', title: 'Southern Homestead Act', description: 'Opened land in 5 Southern states to freedpeople' },
  { id: 'h5', year: 1868, type: 'historical', title: '14th Amendment', description: 'Granted citizenship to all born in US' },
  { id: 'h6', year: 1870, type: 'historical', title: 'First Census After Emancipation', description: 'African Americans listed by name for first time' },
  { id: 'h7', year: 1872, type: 'historical', title: "Freedmen's Bureau Closed", description: 'End of federal assistance programs' },
  { id: 'h8', year: 1877, type: 'historical', title: 'End of Reconstruction', description: 'Federal troops withdrawn from South' },
  { id: 'h9', year: 1896, type: 'historical', title: 'Plessy v. Ferguson', description: '"Separate but equal" doctrine established' },
  { id: 'h10', year: 1910, type: 'historical', title: 'Great Migration Begins', description: 'Mass movement of Black families to Northern cities' },
  { id: 'h11', year: 1930, type: 'historical', title: 'Great Depression Begins', description: 'Many families lost land to tax sales' },
];

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  birth: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
  death: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' },
  marriage: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' },
  land_acquired: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  land_sold: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
  land_inherited: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  tax_sale: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
  census: { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700' },
  probate: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  historical: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-600' },
};

const EVENT_ICONS: Record<string, string> = {
  birth: '👶',
  death: '✝️',
  marriage: '💒',
  land_acquired: '🏠',
  land_sold: '💰',
  land_inherited: '📜',
  tax_sale: '⚠️',
  census: '📊',
  probate: '⚖️',
  historical: '📅',
};

export default function TimelineSection({ caseId }: TimelineSectionProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [showHistorical, setShowHistorical] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    year: '',
    type: 'land_acquired',
    title: '',
    description: '',
    personId: '',
  });

  useEffect(() => {
    if (!caseId) return;

    const fetchData = async () => {
      try {
        const [personsRes, recordsRes] = await Promise.all([
          fetch(`/api/workbook/family-tree/persons?caseId=${caseId}`),
          fetch(`/api/workbook/saved-records?caseId=${caseId}`),
        ]);

        const personsData = await personsRes.json();
        const recordsData = await recordsRes.json();

        setPersons(personsData.persons || []);

        const generatedEvents: TimelineEvent[] = [];

        (personsData.persons || []).forEach((person: Person) => {
          if (person.birth_year) {
            const year = parseInt(person.birth_year);
            if (!isNaN(year)) {
              generatedEvents.push({
                id: `birth-${person.id}`,
                year,
                type: 'birth',
                title: `${person.full_name} born`,
                description: `Birth of ${person.full_name}`,
                personId: person.id,
                personName: person.full_name,
              });
            }
          }
          if (person.death_year) {
            const year = parseInt(person.death_year);
            if (!isNaN(year)) {
              generatedEvents.push({
                id: `death-${person.id}`,
                year,
                type: 'death',
                title: `${person.full_name} died`,
                description: `Death of ${person.full_name}`,
                personId: person.id,
                personName: person.full_name,
              });
            }
          }
        });

        (recordsData.records || []).forEach((record: any) => {
          if (record.is_land_record) {
            const yearMatch = record.details?.match(/\b(18|19|20)\d{2}\b/);
            if (yearMatch) {
              generatedEvents.push({
                id: `record-${record.id}`,
                year: parseInt(yearMatch[0]),
                type: 'land_acquired',
                title: record.record_name || 'Land Record',
                description: record.details || '',
                source: record.source,
              });
            }
          }
        });

        setEvents(generatedEvents);
      } catch (err) {
        console.error('Failed to load timeline data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const addCustomEvent = () => {
    if (!newEvent.year || !newEvent.title) return;

    const event: TimelineEvent = {
      id: `custom-${Date.now()}`,
      year: parseInt(newEvent.year),
      type: newEvent.type as TimelineEvent['type'],
      title: newEvent.title,
      description: newEvent.description,
      personId: newEvent.personId ? parseInt(newEvent.personId) : undefined,
      personName: persons.find(p => p.id === parseInt(newEvent.personId))?.full_name,
    };

    setEvents(prev => [...prev, event]);
    setShowAddModal(false);
    setNewEvent({ year: '', type: 'land_acquired', title: '', description: '', personId: '' });
  };

  const allEvents = showHistorical 
    ? [...events, ...HISTORICAL_EVENTS].sort((a, b) => a.year - b.year)
    : events.sort((a, b) => a.year - b.year);

  const decades = [...new Set(allEvents.map(e => Math.floor(e.year / 10) * 10))].sort();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHistorical}
              onChange={(e) => setShowHistorical(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            Show historical events
          </label>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
        >
          + Add Event
        </button>
      </div>

      {allEvents.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <span className="text-4xl mb-4 block">📅</span>
          <h3 className="font-semibold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-4">
            Add family members with birth/death years or save land records to populate the timeline.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-amber-600 hover:underline"
          >
            Add a custom event
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {decades.map(decade => (
            <div key={decade} className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg z-10">
                  {decade}s
                </div>
                <div className="flex-1 h-px bg-amber-200"></div>
              </div>

              <div className="ml-20 space-y-3">
                {allEvents
                  .filter(e => Math.floor(e.year / 10) * 10 === decade)
                  .map(event => {
                    const colors = EVENT_COLORS[event.type];
                    return (
                      <div
                        key={event.id}
                        className={`${colors.bg} ${colors.border} border-l-4 rounded-r-lg p-4`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{EVENT_ICONS[event.type]}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${colors.text}`}>{event.year}</span>
                              <span className="text-gray-700 font-medium">{event.title}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            {event.personName && (
                              <p className="text-xs text-gray-500 mt-1">Person: {event.personName}</p>
                            )}
                            {event.source && (
                              <p className="text-xs text-gray-500 mt-1">Source: {event.source}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Event Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(EVENT_ICONS).map(([type, icon]) => {
            const colors = EVENT_COLORS[type];
            return (
              <div key={type} className={`${colors.bg} rounded-lg p-2 text-center`}>
                <span className="text-lg">{icon}</span>
                <span className={`text-xs ${colors.text} block capitalize`}>{type.replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Timeline Event</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                  value={newEvent.year}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1895"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="land_acquired">Land Acquired</option>
                  <option value="land_sold">Land Sold</option>
                  <option value="land_inherited">Land Inherited</option>
                  <option value="tax_sale">Tax Sale</option>
                  <option value="probate">Probate</option>
                  <option value="marriage">Marriage</option>
                  <option value="census">Census</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Purchased 40 acres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Details about this event..."
                />
              </div>

              {persons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Person</label>
                  <select
                    value={newEvent.personId}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, personId: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">None</option>
                    {persons.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addCustomEvent}
                disabled={!newEvent.year || !newEvent.title}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

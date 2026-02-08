import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Person {
  id: number;
  full_name: string;
  given_name?: string;
  surname?: string;
  birth_year?: string;
  birth_place?: string;
  death_year?: string;
  death_place?: string;
  gender?: string;
  notes?: string;
  is_primary_ancestor: boolean;
}

interface Relationship {
  id: number;
  person_id: number;
  related_person_id: number;
  relationship_type: string;
}

interface SavedRecord {
  id: number;
  record_name: string;
  record_type?: string;
  source?: string;
  birth_year?: string;
  death_year?: string;
  confidence?: string;
  details?: string;
}

export default function FamilyTreePage() {
  const router = useRouter();
  const { id: caseId } = router.query;

  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [showImportRecords, setShowImportRecords] = useState(false);

  const [newPerson, setNewPerson] = useState({
    fullName: '', givenName: '', surname: '', birthYear: '', birthPlace: '',
    deathYear: '', deathPlace: '', gender: '', notes: '', isPrimaryAncestor: false
  });

  const [newRelationship, setNewRelationship] = useState({
    personId: '', relatedPersonId: '', relationshipType: 'parent'
  });

  useEffect(() => {
    if (!caseId) return;
    fetchData();
  }, [caseId]);

  const fetchData = async () => {
    try {
      const [treeRes, recordsRes] = await Promise.all([
        fetch(`/api/workbook/family-tree/persons?caseId=${caseId}`),
        fetch(`/api/workbook/saved-records?caseId=${caseId}`)
      ]);

      const treeData = await treeRes.json();
      const recordsData = await recordsRes.json();

      if (treeData.success) {
        setPersons(treeData.persons || []);
        setRelationships(treeData.relationships || []);
      }
      if (recordsData.success) {
        setSavedRecords(recordsData.records || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPerson = async () => {
    try {
      const res = await fetch(`/api/workbook/family-tree/persons?caseId=${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson),
      });

      if (res.ok) {
        setShowAddPerson(false);
        setNewPerson({ fullName: '', givenName: '', surname: '', birthYear: '', birthPlace: '', deathYear: '', deathPlace: '', gender: '', notes: '', isPrimaryAncestor: false });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding person:', error);
    }
  };

  const addRelationship = async () => {
    try {
      const res = await fetch(`/api/workbook/family-tree/relationships?caseId=${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRelationship),
      });

      if (res.ok) {
        setShowAddRelationship(false);
        setNewRelationship({ personId: '', relatedPersonId: '', relationshipType: 'parent' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding relationship:', error);
    }
  };

  const importFromRecord = async (record: SavedRecord) => {
    const nameParts = record.record_name.split(' ');
    const surname = nameParts.pop() || '';
    const givenName = nameParts.join(' ');

    try {
      const res = await fetch(`/api/workbook/family-tree/persons?caseId=${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: record.record_name,
          givenName,
          surname,
          birthYear: record.birth_year,
          deathYear: record.death_year,
          notes: `Imported from: ${record.source || 'Saved Record'}\n${record.details || ''}`
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error importing record:', error);
    }
  };

  const getRelatedPersons = (personId: number) => {
    const related: { person: Person; type: string; direction: string }[] = [];
    
    relationships.forEach(rel => {
      if (rel.person_id === personId) {
        const relatedPerson = persons.find(p => p.id === rel.related_person_id);
        if (relatedPerson) {
          related.push({ person: relatedPerson, type: rel.relationship_type, direction: 'to' });
        }
      }
      if (rel.related_person_id === personId) {
        const relatedPerson = persons.find(p => p.id === rel.person_id);
        if (relatedPerson) {
          related.push({ person: relatedPerson, type: rel.relationship_type, direction: 'from' });
        }
      }
    });

    return related;
  };

  const getRelationshipLabel = (type: string, direction: string) => {
    const labels: Record<string, { to: string; from: string }> = {
      parent: { to: 'Parent of', from: 'Child of' },
      child: { to: 'Child of', from: 'Parent of' },
      spouse: { to: 'Spouse of', from: 'Spouse of' },
      sibling: { to: 'Sibling of', from: 'Sibling of' },
    };
    return labels[type]?.[direction as keyof (typeof labels)[string]] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Family Tree | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${caseId}`} className="text-green-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>🌳</span> Family Tree
            </h1>
            <p className="text-green-100 mt-1">Build your ancestor lineage to trace land ownership</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowImportRecords(true)}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Import from Records
                    </button>
                    <button
                      onClick={() => setShowAddPerson(true)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      + Add Person
                    </button>
                  </div>
                </div>

                {persons.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl block mb-3">🌳</span>
                    <p className="mb-4">No family members added yet</p>
                    <p className="text-sm">Add your ancestors or import from saved records</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {persons.filter(p => p.is_primary_ancestor).map(person => (
                      <div key={person.id} className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-600 font-medium">Primary Ancestor</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{person.full_name}</h3>
                            <p className="text-sm text-gray-600">
                              {person.birth_year && `b. ${person.birth_year}`}
                              {person.birth_year && person.death_year && ' - '}
                              {person.death_year && `d. ${person.death_year}`}
                              {person.birth_place && ` | ${person.birth_place}`}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedPerson(person)}
                            className="px-3 py-1 text-sm text-amber-700 hover:bg-amber-100 rounded"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}

                    {persons.filter(p => !p.is_primary_ancestor).map(person => (
                      <div key={person.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPerson(person)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{person.full_name}</h3>
                            <p className="text-sm text-gray-600">
                              {person.birth_year && `b. ${person.birth_year}`}
                              {person.birth_year && person.death_year && ' - '}
                              {person.death_year && `d. ${person.death_year}`}
                            </p>
                            {getRelatedPersons(person.id).length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {getRelatedPersons(person.id).map(r => 
                                  `${getRelationshipLabel(r.type, r.direction)} ${r.person.full_name}`
                                ).join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="text-gray-400">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {persons.length >= 2 && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Relationships</h2>
                    <button
                      onClick={() => setShowAddRelationship(true)}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      + Add Relationship
                    </button>
                  </div>

                  {relationships.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No relationships defined yet. Connect family members to build your tree.</p>
                  ) : (
                    <div className="space-y-2">
                      {relationships.map(rel => {
                        const person1 = persons.find(p => p.id === rel.person_id);
                        const person2 = persons.find(p => p.id === rel.related_person_id);
                        return (
                          <div key={rel.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">{person1?.full_name}</span>
                            <span className="text-purple-600">→ {rel.relationship_type} →</span>
                            <span className="font-medium">{person2?.full_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {selectedPerson && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Person Details</h3>
                    <button onClick={() => setSelectedPerson(null)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-2xl block mb-2">{selectedPerson.gender === 'male' ? '👨' : selectedPerson.gender === 'female' ? '👩' : '👤'}</span>
                      <h4 className="text-lg font-semibold">{selectedPerson.full_name}</h4>
                      {selectedPerson.is_primary_ancestor && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Primary Ancestor</span>
                      )}
                    </div>

                    <dl className="text-sm space-y-2">
                      {selectedPerson.birth_year && (
                        <div>
                          <dt className="text-gray-500">Birth</dt>
                          <dd>{selectedPerson.birth_year}{selectedPerson.birth_place && `, ${selectedPerson.birth_place}`}</dd>
                        </div>
                      )}
                      {selectedPerson.death_year && (
                        <div>
                          <dt className="text-gray-500">Death</dt>
                          <dd>{selectedPerson.death_year}{selectedPerson.death_place && `, ${selectedPerson.death_place}`}</dd>
                        </div>
                      )}
                      {selectedPerson.notes && (
                        <div>
                          <dt className="text-gray-500">Notes</dt>
                          <dd className="whitespace-pre-wrap">{selectedPerson.notes}</dd>
                        </div>
                      )}
                    </dl>

                    {getRelatedPersons(selectedPerson.id).length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Connections</h5>
                        <div className="space-y-1">
                          {getRelatedPersons(selectedPerson.id).map((r, i) => (
                            <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                              <span className="text-purple-600">{getRelationshipLabel(r.type, r.direction)}</span>{' '}
                              <button 
                                onClick={() => setSelectedPerson(r.person)}
                                className="text-blue-600 hover:underline"
                              >
                                {r.person.full_name}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-2">Research Tips</h3>
                <ul className="text-sm text-green-700 space-y-2">
                  <li>• Start with your primary ancestor who owned the land</li>
                  <li>• Add their children to trace inheritance paths</li>
                  <li>• Import records from your searches to link evidence</li>
                  <li>• Look for land deeds mentioning family names</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{persons.length}</div>
                    <div className="text-xs text-gray-500">People</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{relationships.length}</div>
                    <div className="text-xs text-gray-500">Connections</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {showAddPerson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Family Member</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newPerson.fullName}
                    onChange={(e) => setNewPerson({ ...newPerson, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Given Name</label>
                    <input
                      type="text"
                      value={newPerson.givenName}
                      onChange={(e) => setNewPerson({ ...newPerson, givenName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                    <input
                      type="text"
                      value={newPerson.surname}
                      onChange={(e) => setNewPerson({ ...newPerson, surname: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                    <input
                      type="text"
                      value={newPerson.birthYear}
                      onChange={(e) => setNewPerson({ ...newPerson, birthYear: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 1865"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Death Year</label>
                    <input
                      type="text"
                      value={newPerson.deathYear}
                      onChange={(e) => setNewPerson({ ...newPerson, deathYear: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 1940"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Place</label>
                  <input
                    type="text"
                    value={newPerson.birthPlace}
                    onChange={(e) => setNewPerson({ ...newPerson, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Holmes County, Mississippi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={newPerson.gender}
                    onChange={(e) => setNewPerson({ ...newPerson, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newPerson.notes}
                    onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Additional information..."
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPerson.isPrimaryAncestor}
                    onChange={(e) => setNewPerson({ ...newPerson, isPrimaryAncestor: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">This is the primary ancestor (original landowner)</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPerson(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addPerson}
                  disabled={!newPerson.fullName}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add Person
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddRelationship && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Add Relationship</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                  <select
                    value={newRelationship.personId}
                    onChange={(e) => setNewRelationship({ ...newRelationship, personId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select person...</option>
                    {persons.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
                  <select
                    value={newRelationship.relationshipType}
                    onChange={(e) => setNewRelationship({ ...newRelationship, relationshipType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="parent">is Parent of</option>
                    <option value="child">is Child of</option>
                    <option value="spouse">is Spouse of</option>
                    <option value="sibling">is Sibling of</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related To</label>
                  <select
                    value={newRelationship.relatedPersonId}
                    onChange={(e) => setNewRelationship({ ...newRelationship, relatedPersonId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select person...</option>
                    {persons.filter(p => p.id.toString() !== newRelationship.personId).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddRelationship(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addRelationship}
                  disabled={!newRelationship.personId || !newRelationship.relatedPersonId}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Add Relationship
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportRecords && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Import from Saved Records</h3>
                <button onClick={() => setShowImportRecords(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              
              {savedRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No saved records found.</p>
                  <p className="text-sm mt-2">Search for records and save them first.</p>
                  <Link href={`/workbook/search`} className="text-blue-600 hover:underline text-sm mt-4 inline-block">
                    Go to Search →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Click a record to add it as a family member:</p>
                  {savedRecords.map(record => (
                    <button
                      key={record.id}
                      onClick={() => { importFromRecord(record); setShowImportRecords(false); }}
                      className="w-full text-left p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200"
                    >
                      <div className="font-medium">{record.record_name}</div>
                      <div className="text-sm text-gray-500">
                        {record.record_type} | {record.source}
                        {record.birth_year && ` | b. ${record.birth_year}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

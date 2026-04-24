import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DocumentsSectionProps {
  caseId: string;
}

interface SavedRecord {
  id: number;
  record_name: string;
  record_type?: string;
  source?: string;
  birth_year?: string;
  birth_place?: string;
  death_year?: string;
  death_place?: string;
  details?: string;
  confidence?: string;
  is_land_record: boolean;
  land_description?: string;
  created_at: string;
}

export default function DocumentsSection({ caseId }: DocumentsSectionProps) {
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'land' | 'census' | 'vital'>('all');

  useEffect(() => {
    if (!caseId) return;
    fetchRecords();
  }, [caseId]);

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/workbook/saved-records?caseId=${caseId}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'land') return r.is_land_record || r.record_type?.toLowerCase().includes('land') || r.record_type?.toLowerCase().includes('deed');
    if (filter === 'census') return r.record_type?.toLowerCase().includes('census');
    if (filter === 'vital') return r.record_type?.toLowerCase().includes('birth') || r.record_type?.toLowerCase().includes('death') || r.record_type?.toLowerCase().includes('marriage');
    return true;
  });

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Filter Records</h2>
          <Link
            href="/workbook/search"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Search for More Records
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Records', count: records.length },
            { key: 'land', label: 'Land Records', count: records.filter(r => r.is_land_record || r.record_type?.toLowerCase().includes('land')).length },
            { key: 'census', label: 'Census', count: records.filter(r => r.record_type?.toLowerCase().includes('census')).length },
            { key: 'vital', label: 'Vital Records', count: records.filter(r => r.record_type?.toLowerCase().includes('birth') || r.record_type?.toLowerCase().includes('death')).length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-4xl block mb-4">📄</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Records Saved Yet</h3>
          <p className="text-gray-600 mb-4">Search for records and save them to build your evidence collection</p>
          <Link
            href="/workbook/search"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Searching
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => (
            <div key={record.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{record.record_name}</h3>
                    {record.confidence && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(record.confidence)}`}>
                        {record.confidence} match
                      </span>
                    )}
                    {record.is_land_record && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        Land Record
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    {record.record_type && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{record.record_type}</span>
                    )}
                    {record.source && <span>{record.source}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    {record.birth_year && (
                      <div>
                        <span className="text-gray-500">Birth:</span>{' '}
                        <span className="text-gray-900">{record.birth_year}</span>
                        {record.birth_place && <span className="text-gray-600">, {record.birth_place}</span>}
                      </div>
                    )}
                    {record.death_year && (
                      <div>
                        <span className="text-gray-500">Death:</span>{' '}
                        <span className="text-gray-900">{record.death_year}</span>
                        {record.death_place && <span className="text-gray-600">, {record.death_place}</span>}
                      </div>
                    )}
                  </div>

                  {record.details && (
                    <p className="text-gray-600 text-sm">{record.details}</p>
                  )}

                  {record.land_description && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                      <span className="text-xs font-medium text-green-800">Land Description:</span>
                      <p className="text-sm text-green-700 mt-1">{record.land_description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                Saved on {new Date(record.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-2">Building Your Evidence</h3>
        <p className="text-sm text-blue-700 mb-4">
          Each record you save helps build a stronger case for your land claim. Look for:
        </p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Land deeds and patents with your ancestor's name</li>
          <li>• Census records showing your family at the property</li>
          <li>• Tax records proving continuous ownership</li>
          <li>• Probate records showing land inheritance</li>
        </ul>
      </div>
    </div>
  );
}

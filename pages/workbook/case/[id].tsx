import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Case {
  id: number;
  case_title: string;
  ancestor_primary_name: string;
  ancestor_name_variants: string | null;
  jurisdiction_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  personsCount: number;
  recordsCount: number;
  notesCount: number;
  relationshipsCount: number;
}

export default function CaseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [stats, setStats] = useState<Stats>({ personsCount: 0, recordsCount: 0, notesCount: 0, relationshipsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const [caseRes, treeRes, recordsRes, notesRes] = await Promise.all([
          fetch(`/api/workbook/cases/${id}`),
          fetch(`/api/workbook/family-tree/persons?caseId=${id}`),
          fetch(`/api/workbook/saved-records?caseId=${id}`),
          fetch(`/api/workbook/notes?caseId=${id}`),
        ]);
        
        const caseJson = await caseRes.json();
        const treeJson = await treeRes.json();
        const recordsJson = await recordsRes.json();
        const notesJson = await notesRes.json();
        
        if (!caseRes.ok) {
          setError(caseJson.error || 'Failed to load case');
          return;
        }
        
        setCaseData(caseJson.data);
        setStats({
          personsCount: treeJson.persons?.length || 0,
          recordsCount: recordsJson.records?.length || 0,
          notesCount: notesJson.notes?.length || 0,
          relationshipsCount: treeJson.relationships?.length || 0,
        });
      } catch (err) {
        setError('Failed to load case');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href="/workbook" className="text-amber-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Workbook
            </Link>
            <h1 className="text-2xl font-bold">Case Not Found</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border p-8 text-center">
            <p className="text-gray-600 mb-4">{error || 'This case could not be found.'}</p>
            <Link href="/workbook" className="text-amber-600 hover:underline">
              Return to Workbook
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{caseData.case_title} | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href="/workbook" className="text-amber-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Workbook
            </Link>
            <h1 className="text-2xl font-bold">{caseData.case_title}</h1>
            <p className="text-amber-100 mt-1">Research case for {caseData.ancestor_primary_name}</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Details</h2>
                
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Primary Ancestor</dt>
                    <dd className="font-medium text-gray-900">{caseData.ancestor_primary_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Jurisdiction</dt>
                    <dd className="font-medium text-gray-900">{caseData.jurisdiction_code || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        caseData.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {caseData.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(caseData.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    href={`/workbook/search?caseId=${id}&surname=${encodeURIComponent(caseData.ancestor_primary_name.split(' ').pop() || '')}&state=${caseData.jurisdiction_code || ''}`}
                    className="p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🔍</span>
                    <span className="text-sm font-medium">Search Records</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/family-tree`}
                    className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🌳</span>
                    <span className="text-sm font-medium">Family Tree</span>
                    {stats.personsCount > 0 && (
                      <span className="text-xs text-gray-500 block mt-1">{stats.personsCount} people</span>
                    )}
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/checklists`}
                    className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">✅</span>
                    <span className="text-sm font-medium">Checklists</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/timeline`}
                    className="p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">📅</span>
                    <span className="text-sm font-medium">Timeline</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/heirs`}
                    className="p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">⚖️</span>
                    <span className="text-sm font-medium">Heirs Calculator</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/notes`}
                    className="p-4 border rounded-lg hover:bg-yellow-50 hover:border-yellow-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">📝</span>
                    <span className="text-sm font-medium">Notes</span>
                    {stats.notesCount > 0 && (
                      <span className="text-xs text-gray-500 block mt-1">{stats.notesCount} notes</span>
                    )}
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/documents`}
                    className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">📄</span>
                    <span className="text-sm font-medium">Documents</span>
                    {stats.recordsCount > 0 && (
                      <span className="text-xs text-gray-500 block mt-1">{stats.recordsCount} saved</span>
                    )}
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/report`}
                    className="p-4 border rounded-lg hover:bg-red-50 hover:border-red-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">📊</span>
                    <span className="text-sm font-medium">Export Report</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/achievements`}
                    className="p-4 border rounded-lg hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 hover:border-amber-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🏆</span>
                    <span className="text-sm font-medium">Achievements</span>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Tools</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    href={`/workbook/case/${id}/assistant`}
                    className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🤖</span>
                    <span className="text-sm font-medium">AI Assistant</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/dawes-roll`}
                    className="p-4 border rounded-lg hover:bg-teal-50 hover:border-teal-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🪶</span>
                    <span className="text-sm font-medium">Dawes Roll</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/land-patents`}
                    className="p-4 border rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🗺️</span>
                    <span className="text-sm font-medium">Land Patents</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/title-chain`}
                    className="p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🔗</span>
                    <span className="text-sm font-medium">Title Chain</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/legal-templates`}
                    className="p-4 border rounded-lg hover:bg-slate-50 hover:border-slate-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">⚖️</span>
                    <span className="text-sm font-medium">Legal Templates</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/county-links`}
                    className="p-4 border rounded-lg hover:bg-rose-50 hover:border-rose-200 transition text-center block"
                  >
                    <span className="text-2xl mb-2 block">🏛️</span>
                    <span className="text-sm font-medium">County Records</span>
                  </Link>
                  <Link 
                    href={`/workbook/case/${id}/collaborate`}
                    className="p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-200 transition text-center block col-span-2"
                  >
                    <span className="text-2xl mb-2 block">👥</span>
                    <span className="text-sm font-medium">Invite Family to Collaborate</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Research Progress</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Family Members</span>
                      <span className="font-medium">{stats.personsCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(stats.personsCount * 10, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Records Saved</span>
                      <span className="font-medium">{stats.recordsCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(stats.recordsCount * 10, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Connections</span>
                      <span className="font-medium">{stats.relationshipsCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(stats.relationshipsCount * 15, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Research Notes</span>
                      <span className="font-medium">{stats.notesCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(stats.notesCount * 20, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Next Step</h3>
                {stats.personsCount === 0 ? (
                  <>
                    <p className="text-sm text-amber-700 mb-3">
                      Start by adding your primary ancestor to the family tree.
                    </p>
                    <Link 
                      href={`/workbook/case/${id}/family-tree`}
                      className="text-sm text-amber-600 hover:underline font-medium"
                    >
                      Build Family Tree →
                    </Link>
                  </>
                ) : stats.recordsCount === 0 ? (
                  <>
                    <p className="text-sm text-amber-700 mb-3">
                      Search for records related to {caseData.ancestor_primary_name.split(' ').pop()}.
                    </p>
                    <Link 
                      href={`/workbook/search?caseId=${id}&surname=${encodeURIComponent(caseData.ancestor_primary_name.split(' ').pop() || '')}`}
                      className="text-sm text-amber-600 hover:underline font-medium"
                    >
                      Begin Search →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-700 mb-3">
                      Review your saved records and connect them to family members.
                    </p>
                    <Link 
                      href={`/workbook/case/${id}/documents`}
                      className="text-sm text-amber-600 hover:underline font-medium"
                    >
                      View Documents →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

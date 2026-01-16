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

export default function CaseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/workbook/cases/${id}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Failed to load case');
          return;
        }
        
        setCaseData(data.data);
      } catch (err) {
        setError('Failed to load case');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
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
                    href={`/workbook/search?surname=${encodeURIComponent(caseData.ancestor_primary_name.split(' ').pop() || '')}&state=${caseData.jurisdiction_code || ''}`}
                    className="p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-200 transition text-center"
                  >
                    <span className="text-2xl mb-2 block">🔍</span>
                    <span className="text-sm font-medium">Search Records</span>
                  </Link>
                  <button className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition text-center">
                    <span className="text-2xl mb-2 block">📝</span>
                    <span className="text-sm font-medium">Add Notes</span>
                  </button>
                  <button className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition text-center">
                    <span className="text-2xl mb-2 block">🌳</span>
                    <span className="text-sm font-medium">Family Tree</span>
                  </button>
                  <button className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition text-center">
                    <span className="text-2xl mb-2 block">📄</span>
                    <span className="text-sm font-medium">Documents</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Research Progress</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Records Found</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-amber-500 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Documents Saved</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Next Step</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Start by searching for records related to {caseData.ancestor_primary_name.split(' ').pop()}.
                </p>
                <Link 
                  href={`/workbook/search?surname=${encodeURIComponent(caseData.ancestor_primary_name.split(' ').pop() || '')}`}
                  className="text-sm text-amber-600 hover:underline font-medium"
                >
                  Begin Search →
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

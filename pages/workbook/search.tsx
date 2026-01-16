import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FamilySearchPanel from '../../components/workbook/FamilySearchPanel';

interface SearchResult {
  id: string;
  score: number;
  person: {
    id: string;
    name: string;
    gender?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
  };
  sources: Array<{
    title: string;
    citation: string;
    recordType: string;
  }>;
}

interface AIResponse {
  response: string;
}

export default function GenealogySearchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'ai'>('search');
  const [savedResults, setSavedResults] = useState<SearchResult[]>([]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiMode, setAiMode] = useState<string>('resource_finder');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAddEvidence = (result: SearchResult) => {
    setSavedResults(prev => [...prev, result]);
  };

  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiResponse('');

    try {
      const res = await fetch('/api/workbook/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          mode: aiMode,
        }),
      });

      const data = await res.json();
      setAiResponse(data.response || data.error || 'No response received');
    } catch (error) {
      setAiResponse('Failed to get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Genealogy Search | Land Reclamation Workbook</title>
        <meta name="description" content="Search historical records, census data, and land records with AI assistance" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/workbook" className="text-amber-600 hover:text-amber-700 text-sm mb-2 inline-block">
                  ← Back to Workbook
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">AI Genealogy Search</h1>
                <p className="text-sm text-gray-600 mt-1">Search historical records and get AI research guidance</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'search'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              Record Search
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'ai'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              AI Research Assistant
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeTab === 'search' ? (
                <FamilySearchPanel
                  caseId={0}
                  onAddEvidence={handleAddEvidence}
                />
              ) : (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Research Assistant</h2>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { id: 'resource_finder', label: 'Find Resources', icon: '🔍' },
                      { id: 'research_planner', label: 'Plan Research', icon: '📋' },
                      { id: 'evidence_clerk', label: 'Organize Evidence', icon: '📁' },
                      { id: 'dossier_drafter', label: 'Draft Report', icon: '📝' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setAiMode(mode.id)}
                        className={`px-3 py-2 text-sm rounded-lg transition ${
                          aiMode === mode.id
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {mode.icon} {mode.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAISearch} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Question
                      </label>
                      <textarea
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                        placeholder="e.g., How do I find deed records for Holmes County, Mississippi from 1880-1920?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={aiLoading || !aiQuery.trim()}
                      className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
                    >
                      {aiLoading ? 'Thinking...' : 'Ask AI Assistant'}
                    </button>
                  </form>

                  {aiResponse && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h3 className="font-medium text-amber-800 mb-2">AI Response</h3>
                      <div className="text-gray-700 whitespace-pre-wrap text-sm">
                        {aiResponse}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Search Tips</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Try name variants and phonetic spellings</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Expand birth year range by 5-10 years</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Search neighboring counties too</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Check Freedmen's Bureau for post-1865 records</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Key Record Types</h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-blue-50 rounded">
                    <span className="font-medium text-blue-800">Census Records</span>
                    <p className="text-blue-600">1870-1940 best for African American research</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <span className="font-medium text-green-800">Land Deeds</span>
                    <p className="text-green-600">County courthouse or state archives</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <span className="font-medium text-purple-800">Probate Records</span>
                    <p className="text-purple-600">Wills, estate inventories, heir lists</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded">
                    <span className="font-medium text-amber-800">Tax Records</span>
                    <p className="text-amber-600">Property ownership evidence</p>
                  </div>
                </div>
              </div>

              {savedResults.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Saved Results ({savedResults.length})
                  </h3>
                  <div className="space-y-2">
                    {savedResults.map((result, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{result.person.name}</div>
                        <div className="text-gray-500 text-xs">
                          {result.person.birthPlace} • {result.person.birthDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> This tool helps organize genealogical research. 
              It does not provide legal advice or establish legal claims. 
              Always consult a qualified attorney before taking legal action on heir property matters.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

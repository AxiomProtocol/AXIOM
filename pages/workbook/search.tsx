import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface DatabaseLink {
  name: string;
  url: string;
  description: string;
  recordTypes: string[];
  cost: 'free' | 'paid' | 'subscription';
}

interface SearchResponse {
  aiGuidance: string;
  databaseLinks: DatabaseLink[];
  searchParams: any;
}

const STATES = [
  'Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 
  'Maryland', 'Mississippi', 'Missouri', 'North Carolina', 'Oklahoma',
  'South Carolina', 'Tennessee', 'Texas', 'Virginia', 'West Virginia'
];

const RECORD_TYPES = [
  { id: 'census', label: 'Census Records', icon: '📊' },
  { id: 'land', label: 'Land & Deeds', icon: '🏠' },
  { id: 'probate', label: 'Probate & Wills', icon: '📜' },
  { id: 'vital', label: 'Vital Records', icon: '📋' },
  { id: 'military', label: 'Military Records', icon: '🎖️' },
  { id: 'freedmen', label: "Freedmen's Bureau", icon: '📖' },
  { id: 'newspaper', label: 'Newspapers', icon: '📰' },
  { id: 'cemetery', label: 'Cemetery Records', icon: '🪦' },
];

export default function AdvancedGenealogySearch() {
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'databases' | 'guidance'>('databases');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname && !givenName) {
      setError('Please enter at least a surname or given name');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/workbook/genealogy/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname,
          givenName,
          state,
          county,
          yearFrom,
          yearTo,
          recordTypes: selectedRecordTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed');
        return;
      }

      setResults(data);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecordType = (type: string) => {
    setSelectedRecordTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <>
      <Head>
        <title>Advanced Genealogy Search | Land Reclamation Workbook</title>
        <meta name="description" content="Search real genealogy databases including FamilySearch, census records, land deeds, and more" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Link href="/workbook" className="text-amber-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Workbook
            </Link>
            <h1 className="text-3xl font-bold">Advanced Genealogy Search</h1>
            <p className="text-amber-100 mt-1">Search real databases with 22+ billion historical records</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <form onSubmit={handleSearch} className="bg-white rounded-xl border shadow-sm p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Criteria</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Surname *
                    </label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="Johnson, Williams, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Given Name
                    </label>
                    <input
                      type="text"
                      value={givenName}
                      onChange={(e) => setGivenName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="James, Mary, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select state...</option>
                      {STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="Holmes, Washington, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year From
                      </label>
                      <input
                        type="text"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                        placeholder="1850"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year To
                      </label>
                      <input
                        type="text"
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                        placeholder="1940"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Record Types
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {RECORD_TYPES.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleRecordType(type.id)}
                          className={`px-2 py-1.5 text-xs rounded-lg text-left transition ${
                            selectedRecordTypes.includes(type.id)
                              ? 'bg-amber-100 text-amber-800 border-amber-300 border'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          {type.icon} {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
                  >
                    {loading ? 'Searching...' : 'Search Databases'}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2">
              {!results && !loading && (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Search Real Genealogy Databases
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Enter your search criteria to get direct links to FamilySearch, 
                    state archives, land records, and more.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-800">22B+</div>
                      <div className="text-blue-600">Records</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-800">Free</div>
                      <div className="text-green-600">FamilySearch</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-semibold text-purple-800">50+</div>
                      <div className="text-purple-600">States</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <div className="font-semibold text-amber-800">1790+</div>
                      <div className="text-amber-600">Census Years</div>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching databases and generating research guidance...</p>
                </div>
              )}

              {results && (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('databases')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'databases'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-gray-700 border hover:bg-gray-50'
                      }`}
                    >
                      Database Links ({results.databaseLinks.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('guidance')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'guidance'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-gray-700 border hover:bg-gray-50'
                      }`}
                    >
                      AI Research Guidance
                    </button>
                  </div>

                  {activeTab === 'databases' && (
                    <div className="space-y-4">
                      {results.databaseLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-white rounded-xl border p-5 hover:shadow-lg transition group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600">
                                  {link.name}
                                </h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  link.cost === 'free' 
                                    ? 'bg-green-100 text-green-700'
                                    : link.cost === 'subscription'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {link.cost === 'free' ? 'Free' : link.cost === 'subscription' ? 'Subscription' : 'Paid'}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{link.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {link.recordTypes.map((type, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-amber-500 group-hover:text-amber-600 ml-4">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {activeTab === 'guidance' && (
                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">AI Research Guidance</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {results.aiGuidance}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Free Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.familysearch.org/search/records" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    FamilySearch.org
                  </a>
                  <span className="text-gray-500"> - 22B+ free records</span>
                </li>
                <li>
                  <a href="https://glorecords.blm.gov" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    BLM Land Patents
                  </a>
                  <span className="text-gray-500"> - Federal land records</span>
                </li>
                <li>
                  <a href="https://www.findagrave.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    Find A Grave
                  </a>
                  <span className="text-gray-500"> - Cemetery records</span>
                </li>
                <li>
                  <a href="https://www.archives.gov/research/genealogy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    National Archives
                  </a>
                  <span className="text-gray-500"> - Federal records</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">African American Genealogy</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.familysearch.org/en/wiki/African_American_Genealogy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    FamilySearch Wiki Guide
                  </a>
                </li>
                <li>
                  <a href="https://www.familysearch.org/search/collection/1989155" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    Freedmen's Bureau Records
                  </a>
                </li>
                <li>
                  <a href="https://www.discoverfreedmen.org" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    Discover Freedmen
                  </a>
                </li>
                <li>
                  <a href="https://www.slavevoyages.org" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    Slave Voyages Database
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Land & Property Records</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://glorecords.blm.gov" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    BLM General Land Office
                  </a>
                </li>
                <li>
                  <a href="https://www.familysearch.org/en/wiki/United_States_Land_and_Property" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    Land Records Wiki
                  </a>
                </li>
                <li>
                  <a href="https://www.archives.gov/research/land" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    NARA Land Records
                  </a>
                </li>
                <li>
                  <a href="https://deeds.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    County Deed Search
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Disclaimer:</strong> This tool helps organize genealogical research by providing 
              links to real databases. It does not provide legal advice or establish legal claims. 
              Always verify records independently and consult a qualified attorney for heir property matters.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

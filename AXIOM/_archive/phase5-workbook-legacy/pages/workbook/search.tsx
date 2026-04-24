import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface DatabaseLink {
  name: string;
  url: string;
  description: string;
  recordTypes: string[];
  cost: 'free' | 'paid' | 'subscription';
}

interface SearchResult {
  id: string;
  name: string;
  birthYear?: string;
  birthPlace?: string;
  deathYear?: string;
  deathPlace?: string;
  recordType: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

interface SearchResponse {
  searchResults: SearchResult[];
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
  { id: 'census', label: 'Census', icon: '📊' },
  { id: 'land', label: 'Land Deeds', icon: '🏠' },
  { id: 'probate', label: 'Probate', icon: '📜' },
  { id: 'vital', label: 'Vital', icon: '📋' },
  { id: 'military', label: 'Military', icon: '🎖️' },
  { id: 'freedmen', label: "Freedmen's", icon: '📖' },
];

export default function AdvancedGenealogySearch() {
  const router = useRouter();
  const { caseId, surname: urlSurname, state: urlState } = router.query;

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
  const [activeTab, setActiveTab] = useState<'results' | 'guidance' | 'databases'>('results');
  const [savedResults, setSavedResults] = useState<SearchResult[]>([]);
  const [savingRecord, setSavingRecord] = useState<string | null>(null);

  useEffect(() => {
    if (urlSurname && typeof urlSurname === 'string') setSurname(urlSurname);
    if (urlState && typeof urlState === 'string') setState(urlState);
  }, [urlSurname, urlState]);

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
      setActiveTab('results');
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

  const saveResult = async (result: SearchResult) => {
    if (savedResults.find(r => r.id === result.id)) return;
    
    setSavingRecord(result.id);
    
    if (caseId) {
      try {
        const res = await fetch(`/api/workbook/saved-records?caseId=${caseId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordName: result.name,
            recordType: result.recordType,
            source: result.source,
            birthYear: result.birthYear,
            birthPlace: result.birthPlace,
            deathYear: result.deathYear,
            deathPlace: result.deathPlace,
            details: result.details,
            confidence: result.confidence,
            isLandRecord: result.recordType?.toLowerCase().includes('land') || result.recordType?.toLowerCase().includes('deed'),
            rawData: result,
          }),
        });

        if (res.ok) {
          setSavedResults(prev => [...prev, result]);
        }
      } catch (err) {
        console.error('Failed to save record:', err);
      }
    } else {
      setSavedResults(prev => [...prev, result]);
    }
    
    setSavingRecord(null);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      <Head>
        <title>AI Genealogy Search | Land Reclamation Workbook</title>
        <meta name="description" content="Search historical records with AI-powered guidance for heir property research" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Link 
              href={caseId ? `/workbook/case/${caseId}` : '/workbook'} 
              className="text-amber-100 hover:text-white text-sm mb-2 inline-block"
            >
              ← {caseId ? 'Back to Case' : 'Back to Workbook'}
            </Link>
            <h1 className="text-3xl font-bold">AI Genealogy Search</h1>
            <p className="text-amber-100 mt-1">
              Search historical records and get AI research guidance
              {caseId && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">Saving to Case</span>}
            </p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Search Form */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSearch} className="bg-white rounded-xl border shadow-sm p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Records</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Johnson, Williams..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Given Name</label>
                    <input
                      type="text"
                      value={givenName}
                      onChange={(e) => setGivenName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="James, Mary..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select state...</option>
                      {STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                    <input
                      type="text"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Holmes, Washington..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year From</label>
                      <input
                        type="text"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="1850"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year To</label>
                      <input
                        type="text"
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="1940"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Record Types</label>
                    <div className="flex flex-wrap gap-2">
                      {RECORD_TYPES.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleRecordType(type.id)}
                          className={`px-3 py-1.5 text-xs rounded-full transition ${
                            selectedRecordTypes.includes(type.id)
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {type.icon} {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-red-600 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Searching...
                      </span>
                    ) : 'Search Records'}
                  </button>
                </div>

                {savedResults.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Saved Results ({savedResults.length})
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {savedResults.map(r => (
                        <div key={r.id} className="text-xs p-2 bg-amber-50 rounded">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-gray-500">{r.source}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Results */}
            <div className="lg:col-span-2">
              {!results && !loading && (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Search Historical Records
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Enter your ancestor's information to find matching records across 
                    census, land deeds, vital records, and more.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm max-w-sm mx-auto">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-800">Census</div>
                      <div className="text-blue-600 text-xs">1790-1950</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-800">Land</div>
                      <div className="text-green-600 text-xs">Deeds & Patents</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-semibold text-purple-800">Freedmen</div>
                      <div className="text-purple-600 text-xs">Bureau Records</div>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching historical records...</p>
                  <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex gap-2 bg-white rounded-lg p-1 border">
                    <button
                      onClick={() => setActiveTab('results')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                        activeTab === 'results'
                          ? 'bg-amber-500 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Records ({results.searchResults?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('guidance')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                        activeTab === 'guidance'
                          ? 'bg-amber-500 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Research Guidance
                    </button>
                    <button
                      onClick={() => setActiveTab('databases')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                        activeTab === 'databases'
                          ? 'bg-amber-500 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Search Links
                    </button>
                  </div>

                  {/* Results Tab */}
                  {activeTab === 'results' && (
                    <div className="space-y-3">
                      {results.searchResults?.length > 0 ? (
                        results.searchResults.map((result) => (
                          <div key={result.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900 text-lg">{result.name}</h3>
                                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getConfidenceColor(result.confidence)}`}>
                                    {result.confidence} match
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                                  {result.birthYear && (
                                    <div>
                                      <span className="text-gray-500">Birth:</span>{' '}
                                      <span className="text-gray-900">{result.birthYear}</span>
                                      {result.birthPlace && <span className="text-gray-600">, {result.birthPlace}</span>}
                                    </div>
                                  )}
                                  {result.deathYear && (
                                    <div>
                                      <span className="text-gray-500">Death:</span>{' '}
                                      <span className="text-gray-900">{result.deathYear}</span>
                                      {result.deathPlace && <span className="text-gray-600">, {result.deathPlace}</span>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {result.recordType}
                                  </span>
                                  <span className="text-sm text-gray-500">{result.source}</span>
                                </div>

                                <p className="text-gray-600 text-sm">{result.details}</p>
                              </div>

                              <button
                                onClick={() => saveResult(result)}
                                disabled={savingRecord === result.id}
                                className={`ml-4 p-2 rounded-lg transition ${
                                  savedResults.find(r => r.id === result.id)
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                                }`}
                                title="Save to collection"
                              >
                                <svg className="w-5 h-5" fill={savedResults.find(r => r.id === result.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded-xl border p-8 text-center">
                          <p className="text-gray-500">No records found. Try adjusting your search criteria or check the Research Guidance tab for suggestions.</p>
                        </div>
                      )}

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <strong>Note:</strong> These are AI-generated potential matches based on historical patterns. 
                        Verify all records through official sources using the Search Links tab.
                      </div>
                    </div>
                  )}

                  {/* Guidance Tab */}
                  {activeTab === 'guidance' && (
                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">AI Research Guidance</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {results.aiGuidance || 'No guidance available.'}
                      </div>
                    </div>
                  )}

                  {/* Database Links Tab */}
                  {activeTab === 'databases' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">
                        Click these links to search the actual databases with your criteria:
                      </p>
                      {results.databaseLinks?.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-white rounded-xl border p-4 hover:shadow-md transition group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600">
                                  {link.name}
                                </h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  link.cost === 'free' 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {link.cost === 'free' ? 'Free' : 'Subscription'}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm">{link.description}</p>
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
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

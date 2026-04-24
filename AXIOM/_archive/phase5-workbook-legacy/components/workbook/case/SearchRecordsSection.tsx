import React, { useState, useEffect } from 'react';

interface SearchRecordsSectionProps {
  caseId: string;
}

interface SearchResult {
  id: string;
  name: string;
  years: string;
  description: string;
  count: string;
  category: string;
  relevanceScore: number;
  searchUrl: string;
  directLinks: { source: string; url: string; type: string; icon: string }[];
}

interface CategoryStats {
  category: string;
  count: number;
  total: number;
}

const CATEGORY_INFO: Record<string, { name: string; icon: string; color: string }> = {
  census: { name: 'Census Records', icon: '📊', color: 'bg-blue-100 text-blue-800' },
  freedmen: { name: "Freedmen's Bureau", icon: '📜', color: 'bg-amber-100 text-amber-800' },
  land: { name: 'Land Records', icon: '🗺️', color: 'bg-green-100 text-green-800' },
  vital: { name: 'Vital Records', icon: '📋', color: 'bg-purple-100 text-purple-800' },
  military: { name: 'Military Records', icon: '🎖️', color: 'bg-red-100 text-red-800' },
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

export default function SearchRecordsSection({ caseId }: SearchRecordsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (caseId) {
      fetch(`/api/workbook/cases/${caseId}`)
        .then(res => res.json())
        .then(json => {
          setCaseData(json.data);
          if (json.data?.ancestor_primary_name) {
            setSearchQuery(json.data.ancestor_primary_name);
          }
        })
        .catch(console.error);
    }
  }, [caseId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('/api/workbook/genealogy/direct-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          categories: selectedCategories,
          state: selectedState,
          yearStart,
          yearEnd,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResults(json.results);
        setCategoryStats(json.categoryStats);
        setTips(json.tips);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const saveRecord = async (result: SearchResult) => {
    try {
      await fetch('/api/workbook/saved-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          record_source: result.directLinks[0]?.source || 'Search',
          record_type: result.category,
          record_title: result.name,
          record_url: result.searchUrl,
          notes: `${result.description} (${result.years})`,
        }),
      });
      alert('Record saved to your case!');
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Surname or Full Name</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter ancestor name..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State (optional)</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All States</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year From</label>
              <input
                type="number"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                placeholder="1850"
                min="1700"
                max="2000"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year To</label>
              <input
                type="number"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                placeholder="1950"
                min="1700"
                max="2000"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Record Categories (optional)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCategories.includes(key)
                    ? `${info.color} ring-2 ring-offset-1 ring-gray-400`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {info.icon} {info.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Searching...' : 'Search Records'}
        </button>
      </div>

      {hasSearched && !loading && (
        <>
          {tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-medium text-amber-800 mb-2">💡 Search Tips</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                {tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid md:grid-cols-5 gap-2">
            {categoryStats.map(stat => (
              <div key={stat.category} className="bg-white rounded-lg border p-3 text-center">
                <div className="text-2xl">{CATEGORY_INFO[stat.category]?.icon}</div>
                <div className="text-lg font-bold text-gray-900">{stat.count}</div>
                <div className="text-xs text-gray-500">{CATEGORY_INFO[stat.category]?.name}</div>
              </div>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <p>No matching record collections found.</p>
              <p className="text-sm mt-1">Try adjusting your search criteria or removing filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Found {results.length} relevant record collections
              </h2>
              
              {results.map(result => (
                <div key={result.id} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_INFO[result.category]?.color}`}>
                        {CATEGORY_INFO[result.category]?.icon} {CATEGORY_INFO[result.category]?.name}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mt-2">{result.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-emerald-600">{result.years}</div>
                      <div className="text-xs text-gray-500">{result.count}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.directLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          link.type === 'free' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {link.icon} {link.source}
                        {link.type === 'free' && <span className="text-xs">(Free)</span>}
                      </a>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={result.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-center font-medium transition"
                    >
                      Search This Collection →
                    </a>
                    <button
                      onClick={() => saveRecord(result)}
                      className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!hasSearched && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Record Collections</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <div key={key} className={`p-4 rounded-lg ${info.color.replace('text-', 'border-').replace('100', '200')} border`}>
                <div className="text-3xl mb-2">{info.icon}</div>
                <h3 className="font-medium">{info.name}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {key === 'census' && '1870-1950 US Federal Census records'}
                  {key === 'freedmen' && "Freedmen's Bureau labor, marriage, bank records"}
                  {key === 'land' && 'BLM patents, homestead, Southern Claims'}
                  {key === 'vital' && 'Birth, death, and marriage records'}
                  {key === 'military' && 'USCT, Civil War pensions, WWI/WWII draft'}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h3 className="font-medium text-emerald-800 mb-2">🌳 Getting Started</h3>
            <p className="text-sm text-emerald-700">
              Enter your ancestor's name above to search across all major genealogical record collections. 
              We'll show you which databases have relevant records and provide direct links to search them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

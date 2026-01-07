import React, { useState, useEffect } from 'react';

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

interface FamilySearchPanelProps {
  caseId: number;
  ancestorName?: string;
  jurisdiction?: string;
  onAddEvidence?: (result: SearchResult) => void;
}

export default function FamilySearchPanel({ 
  caseId, 
  ancestorName = '', 
  jurisdiction = '',
  onAddEvidence 
}: FamilySearchPanelProps) {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const nameParts = ancestorName.split(' ');
  const [givenName, setGivenName] = useState(nameParts[0] || '');
  const [surname, setSurname] = useState(nameParts.slice(1).join(' ') || '');
  const [birthPlace, setBirthPlace] = useState(jurisdiction || '');
  const [birthYearFrom, setBirthYearFrom] = useState('');
  const [birthYearTo, setBirthYearTo] = useState('');
  const [searchType, setSearchType] = useState<'records' | 'tree'>('records');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/workbook/familysearch/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError('Failed to check FamilySearch status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/workbook/familysearch/auth';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!givenName && !surname) {
      setError('Please enter at least a first or last name');
      return;
    }

    setSearching(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch('/api/workbook/familysearch/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          givenName: givenName || undefined,
          surname: surname || undefined,
          birthPlace: birthPlace || undefined,
          birthDateFrom: birthYearFrom || undefined,
          birthDateTo: birthYearTo || undefined,
          searchType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsConnection) {
          setStatus(prev => prev ? { ...prev, connected: false } : null);
          setError('Your FamilySearch session expired. Please reconnect.');
        } else {
          setError(data.error || 'Search failed');
        }
        return;
      }

      setResults(data.results || []);
      if (data.results?.length === 0) {
        setError('No results found. Try broadening your search criteria.');
      }
    } catch (err) {
      setError('Search request failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🌳</div>
          <h3 className="font-semibold text-gray-900 mb-2">FamilySearch Integration</h3>
          <p className="text-gray-600 mb-4">
            Direct FamilySearch integration is coming soon! In the meantime, use the AI Assistant's Resource Finder to get search links.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
            <p className="font-medium text-blue-800 mb-2">You can still search FamilySearch:</p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Go to the AI Assistant tab</li>
              <li>Select "Resource Finder" mode</li>
              <li>Ask for search links for your ancestor</li>
              <li>Or visit FamilySearch.org directly (free account)</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🌳</div>
          <h3 className="font-semibold text-gray-900 mb-2">Connect to FamilySearch</h3>
          <p className="text-gray-600 mb-6">
            Connect your FamilySearch account to search billions of genealogy records directly from your workbook.
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Connect FamilySearch Account
          </button>
          <p className="text-xs text-gray-500 mt-4">
            You'll be redirected to FamilySearch to authorize access. It's free!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <h3 className="font-semibold text-gray-900">FamilySearch Records</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="p-4 border-b space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="e.g., Mary"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="e.g., Johnson"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Place</label>
          <input
            type="text"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="e.g., Alabama, USA"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year From</label>
            <input
              type="number"
              value={birthYearFrom}
              onChange={(e) => setBirthYearFrom(e.target.value)}
              placeholder="e.g., 1880"
              min="1500"
              max="2020"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year To</label>
            <input
              type="number"
              value={birthYearTo}
              onChange={(e) => setBirthYearTo(e.target.value)}
              placeholder="e.g., 1920"
              min="1500"
              max="2020"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="records"
              checked={searchType === 'records'}
              onChange={() => setSearchType('records')}
              className="text-green-600"
            />
            <span className="text-sm">Historical Records</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="tree"
              checked={searchType === 'tree'}
              onChange={() => setSearchType('tree')}
              className="text-green-600"
            />
            <span className="text-sm">Family Tree</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={searching}
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
        >
          {searching ? 'Searching...' : 'Search FamilySearch'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {results.length > 0 && (
          <div className="divide-y">
            {results.map((result) => (
              <div key={result.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{result.person.name}</h4>
                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                      {result.person.birthDate && (
                        <p>Born: {result.person.birthDate} {result.person.birthPlace && `in ${result.person.birthPlace}`}</p>
                      )}
                      {result.person.deathDate && (
                        <p>Died: {result.person.deathDate} {result.person.deathPlace && `in ${result.person.deathPlace}`}</p>
                      )}
                      {result.person.gender && (
                        <p className="text-xs text-gray-500">Gender: {result.person.gender}</p>
                      )}
                    </div>
                    {result.sources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Sources:</p>
                        {result.sources.slice(0, 2).map((source, i) => (
                          <p key={i} className="text-xs text-gray-600 truncate">{source.title}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <a
                      href={`https://www.familysearch.org/tree/person/details/${result.person.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      View on FS
                    </a>
                    {onAddEvidence && (
                      <button
                        onClick={() => onAddEvidence(result)}
                        className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition"
                      >
                        Add as Evidence
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !error && !searching && (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">Enter search criteria above to find records</p>
            <p className="text-xs mt-2">Tip: Start with just a name and location, then refine</p>
          </div>
        )}
      </div>
    </div>
  );
}

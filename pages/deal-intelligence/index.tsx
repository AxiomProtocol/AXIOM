import { useState, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';

interface SearchResult {
  id: string;
  addressRaw: string;
  addressNormalized: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  propertyType: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: string | null;
  yearBuilt: number | null;
}

export default function DealIntelligenceSearch() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (city) params.set('city', city);
      if (state) params.set('state', state);

      const res = await fetch(`/api/real-estate/properties/search?${params.toString()}`);
      const json = await res.json();

      if (json.error) {
        setError(json.error.message || 'Search failed');
        setResults([]);
      } else {
        setResults(json.data?.properties || []);
      }
    } catch (err) {
      setError('Failed to connect to search service');
    } finally {
      setLoading(false);
    }
  }, [query, city, state]);

  const handleResolve = useCallback(async () => {
    if (!query || query.trim().length < 5) {
      setError('Enter a full address to resolve (min 5 characters)');
      return;
    }
    setResolving(true);
    setError('');
    try {
      const fullAddress = [query.trim(), city.trim(), state.trim()].filter(Boolean).join(', ');
      const res = await fetch('/api/real-estate/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error?.message || `Resolution failed (status ${res.status})`);
      } else if (json.data?.propertyId) {
        window.location.href = `/deal-intelligence/property/${json.data.propertyId}`;
      } else {
        setError('Unexpected response from server. Please try again.');
      }
    } catch (err: any) {
      setError(`Failed to connect to resolve service: ${err.message || 'Network error'}`);
    } finally {
      setResolving(false);
    }
  }, [query, city, state]);

  return (
    <DesignLawLayout>
      <Head>
        <title>Deal Intelligence - Property Search | AXIOM</title>
      </Head>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">Deal Intelligence</h1>
            <p className="text-dl-muted font-dl-mono text-sm">
              Search properties, analyze deals, and run underwriting scenarios
            </p>
          </div>
          <a
            href="/api/documents/deal-intelligence-brief"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm hover:bg-dl-navy hover:text-white transition-colors flex-shrink-0"
          >
            Download Brief
          </a>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Property Search</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-dl-mono text-dl-muted mb-1">Address or Keywords</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="123 Main St, Springfield, IL"
                className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="block text-sm font-dl-mono text-dl-muted mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-dl-mono text-dl-muted mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="IL"
                maxLength={2}
                className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy uppercase"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm hover:bg-dl-navy/90 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Properties'}
            </button>
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="border border-dl-navy text-dl-navy px-6 py-2 font-dl-mono text-sm hover:bg-dl-navy/5 disabled:opacity-50"
            >
              {resolving ? 'Resolving...' : 'Resolve Address'}
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 mb-6">
            <p className="text-red-700 font-dl-mono text-sm">{error}</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && !error && (
          <div className="border border-dl-border p-6 text-center">
            <p className="text-dl-muted font-dl-mono text-sm">No properties found. Try resolving the address to create a new entry.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="border border-dl-border">
            <div className="bg-dl-bg border-b border-dl-border px-4 py-2">
              <span className="font-dl-mono text-sm text-dl-muted">{results.length} properties found</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-dl-border bg-dl-bg/50">
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">Address</th>
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">City</th>
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">State</th>
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">Type</th>
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">Sqft</th>
                  <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((prop) => (
                  <tr key={prop.id} className="border-b border-dl-border hover:bg-dl-bg/30">
                    <td className="px-4 py-3 font-dl-mono text-sm text-dl-text">{prop.addressRaw || prop.addressNormalized}</td>
                    <td className="px-4 py-3 font-dl-mono text-sm text-dl-muted">{prop.city || '-'}</td>
                    <td className="px-4 py-3 font-dl-mono text-sm text-dl-muted">{prop.state || '-'}</td>
                    <td className="px-4 py-3 font-dl-mono text-sm text-dl-muted">{prop.propertyType || '-'}</td>
                    <td className="px-4 py-3 font-dl-mono text-sm text-dl-muted">{prop.sqft?.toLocaleString() || '-'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/deal-intelligence/property/${prop.id}`}
                        className="text-dl-navy font-dl-mono text-sm underline hover:no-underline"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}

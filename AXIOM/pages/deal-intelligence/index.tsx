import ContractStatusBadge from "./ContractStatusBadge";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Image from 'next/image';
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

function parseAddress(fullAddress: string): { street: string; city: string; state: string } {
  const parts = fullAddress.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*\d{0,5}/i);
    return {
      street: parts.slice(0, parts.length - 2).join(', '),
      city: parts[parts.length - 2],
      state: stateZipMatch ? stateZipMatch[1].toUpperCase() : lastPart.substring(0, 2).toUpperCase(),
    };
  } else if (parts.length === 2) {
    return { street: parts[0], city: '', state: parts[1].substring(0, 2).toUpperCase() };
  }
  return { street: fullAddress, city: '', state: '' };
}

export default function DealIntelligenceSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [resolving, setResolving] = useState(false);
  const autoResolveTriggered = useRef(false);

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

  useEffect(() => {
    if (!router.isReady || autoResolveTriggered.current) return;
    const addressParam = router.query.address as string | undefined;
    if (!addressParam) return;

    autoResolveTriggered.current = true;
    const parsed = parseAddress(addressParam);
    setQuery(parsed.street);
    setCity(parsed.city);
    setState(parsed.state);

    (async () => {
      setResolving(true);
      setError('');
      try {
        const res = await fetch('/api/real-estate/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addressParam }),
        });
        const json = await res.json();

        if (!res.ok || json.error) {
          setError(json.error?.message || `Resolution failed (status ${res.status})`);
        } else if (json.data?.propertyId) {
          router.replace(`/deal-intelligence/property/${json.data.propertyId}`);
        } else {
          setError('Could not resolve this address. Try searching manually.');
        }
      } catch (err: any) {
        setError(`Failed to connect to resolve service: ${err.message || 'Network error'}`);
      } finally {
        setResolving(false);
      }
    })();
  }, [router.isReady, router.query.address]);

  return (
    <DesignLawLayout>
      <Head>
        <title>Deal Intelligence - Property Search | AXIOM</title>
      </Head>

      <div className="w-full mb-6 overflow-hidden border border-dl-border">
        <div className="relative w-full" style={{ height: '320px' }}>
          <Image
            src="/images/realestate/deal_intelligence_hero.png"
            alt="Deal Intelligence — Institutional Underwriting Workspace"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Real Asset Deployment Layer — Institutional Underwriting Workspace</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Deal Intelligence</h1>
        <p className="text-dl-gray text-sm mb-6">
          Structured underwriting workspace for acquisition targets sourced through the Distressed Feed or RE Intelligence.
          Each property undergoes value analysis, rehab cost modeling, multi-exit scoring, and capital readiness review
          before advancing to the land acquisition pipeline.
        </p>
      </div>

      <div className="border border-dl-border mb-6">
        <div className="border-b border-dl-border px-5 py-3 bg-dl-bg-alt">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">Underwriting Chain — Source → Analyze → Score → Advance</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Source</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Distressed Feed / RE Intelligence</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Acquisition targets enter from the Distressed Feed (foreclosures, tax liens, wholesale) or RE Intelligence property search.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Analyze</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Value + Rehab Modeling</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              AI-powered valuation with Craftsman NCE rehab cost bands, rental comp analysis, and tightened confidence intervals.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Score</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Multi-Exit Underwriting</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Eight exit strategies evaluated: fix-and-flip, rental hold, wholesale, BRRRR, land bank, seller finance, short-term, and ground lease.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Advance</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Land Pipeline Submission</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Qualified deals advance through governance approval into the six-stage land acquisition pipeline and on-chain registry.
            </p>
          </div>
        </div>
      </div>

      {/* Contract Status Summary Widget for Search Results */}
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Search Results</h2>
          <ul className="space-y-2">
            {results.map((result) => (
              <li key={result.id} className="border rounded p-3 flex items-center gap-4">
                <div className="flex-1">
                  <Link href={`/deal-intelligence/property/${result.id}`} className="text-blue-700 font-semibold hover:underline">
                    {result.addressRaw || result.addressNormalized}
                  </Link>
                  <div className="text-xs text-gray-500">{result.city}, {result.state} {result.zip}</div>
                  <div className="text-xs text-gray-400">{result.propertyType} | {result.sqft} sqft | {result.bedrooms} beds | {result.bathrooms} baths</div>
                </div>
                {/* Contract Status Badge (async fetch) */}
                <ContractStatusBadge propertyId={result.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Property Search</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-sm font-dl-mono text-dl-muted mb-1">Address or Keywords</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="123 Main St, Springfield, IL"
                className="w-full border border-dl-border px-3 py-2.5 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy min-h-[44px]"
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
                className="w-full border border-dl-border px-3 py-2.5 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy min-h-[44px]"
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
                className="w-full border border-dl-border px-3 py-2.5 font-dl-mono text-sm bg-white text-dl-text focus:outline-none focus:border-dl-navy uppercase min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-dl-navy text-white px-6 py-3 min-h-[44px] font-dl-mono text-sm hover:bg-dl-navy/90 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Properties'}
            </button>
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="border border-dl-navy text-dl-navy px-6 py-3 min-h-[44px] font-dl-mono text-sm hover:bg-dl-navy/5 disabled:opacity-50"
            >
              {resolving ? 'Resolving...' : 'Resolve Address'}
            </button>
          </div>
        </div>

        {resolving && router.query.address && (
          <div className="border border-dl-border bg-dl-bg p-6 mb-6 text-center">
            <p className="text-dl-navy font-dl-mono text-sm mb-2">Resolving property address...</p>
            <p className="text-dl-muted font-dl-mono text-xs">{router.query.address}</p>
          </div>
        )}

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
            <div className="hidden sm:block overflow-x-auto">
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
                          className="text-dl-navy font-dl-mono text-sm underline hover:no-underline min-h-[44px] inline-flex items-center"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden">
              {results.map((prop) => (
                <div key={prop.id} className="border-b border-dl-border p-4">
                  <div className="font-dl-mono text-sm text-dl-text mb-1">{prop.addressRaw || prop.addressNormalized}</div>
                  <div className="font-dl-mono text-xs text-dl-muted mb-2">
                    {prop.city || '-'}, {prop.state || '-'} {prop.propertyType ? `| ${prop.propertyType}` : ''} {prop.sqft ? `| ${prop.sqft.toLocaleString()} sqft` : ''}
                  </div>
                  <Link
                    href={`/deal-intelligence/property/${prop.id}`}
                    className="inline-flex items-center text-dl-navy font-dl-mono text-sm underline hover:no-underline min-h-[44px]"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}

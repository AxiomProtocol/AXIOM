import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

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

      <div className="relative w-full h-40 sm:h-52 lg:h-64 -mt-6 sm:-mt-8 -mx-4 sm:-mx-6 mb-6 overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
        <Image
          src="/images/realestate/deal_intelligence_hero.png"
          alt="Deal Intelligence"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <h1 className="font-dl-serif text-xl sm:text-2xl lg:text-3xl text-white">Deal Intelligence</h1>
          <p className="font-dl-mono text-xs sm:text-sm text-gray-300 mt-1">Search properties, analyze deals, and run underwriting scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '/images/realestate/icon_search.png', label: 'Property Search', desc: 'Find and resolve addresses' },
          { icon: '/images/realestate/icon_underwrite.png', label: 'Underwriting', desc: 'Run scenario analysis' },
          { icon: '/images/realestate/icon_diligence.png', label: 'Due Diligence', desc: 'Structured DD checklists' },
          { icon: '/images/realestate/icon_ai.png', label: 'AI Advisory', desc: 'Gemini-powered insights' },
        ].map((cap) => (
          <div key={cap.label} className="border border-dl-border p-3 sm:p-4 flex flex-col items-center text-center">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 mb-2">
              <Image src={cap.icon} alt="" fill className="object-contain" />
            </div>
            <p className="font-dl-serif text-xs sm:text-sm text-dl-navy font-bold">{cap.label}</p>
            <p className="font-dl-mono text-[10px] sm:text-xs text-dl-muted mt-0.5">{cap.desc}</p>
          </div>
        ))}
      </div>

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

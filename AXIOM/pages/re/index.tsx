import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  SectionHeading,
  DisclosureBlock,
  FormField,
  DLInput,
  SolidButton,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface PropertyRow {
  id: string;
  address_normalized: string;
  address_raw: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  sqft: number | null;
  bedrooms: number | null;
  year_built: number | null;
}

const RE_DISCLOSURE = 'Property data is sourced from internal records and may not reflect current market conditions. Confidence scores indicate data completeness, not market outcomes. All deal analysis is probabilistic. Past performance of comparable properties does not indicate future results.';

export default function REPropertiesSearch() {
  const router = useRouter();
  const { walletState } = useWallet();

  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [results, setResults] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const handleSearch = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setSearched(false);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (city.trim()) params.set('city', city.trim());
      if (state.trim()) params.set('state', state.trim());
      if (zip.trim()) params.set('zip', zip.trim());

      if (!params.toString()) {
        setErrorMsg('Enter at least one search field.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/re/properties/search?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        setErrorMsg(json.error?.message || 'Search failed.');
        setResults([]);
      } else {
        setResults(json.data || []);
        setAsOf(json.meta?.as_of || null);
        setConfidence(json.meta?.confidence ?? null);
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [q, city, state, zip]);

  const columns: Column<PropertyRow>[] = [
    {
      key: 'address_normalized',
      header: 'Address',
      render: (row) => (
        <button
          onClick={() => router.push(`/re/${row.id}`)}
          className="text-dl-navy underline text-left"
        >
          {row.address_normalized || row.address_raw}
        </button>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (row) => row.city || '—',
    },
    {
      key: 'state',
      header: 'ST',
      render: (row) => row.state || '—',
    },
    {
      key: 'zip',
      header: 'ZIP',
      render: (row) => row.zip || '—',
    },
    {
      key: 'property_type',
      header: 'Type',
      render: (row) => row.property_type || '—',
    },
    {
      key: 'sqft',
      header: 'Sq Ft',
      align: 'right' as const,
      render: (row) => row.sqft ? row.sqft.toLocaleString() : '—',
    },
    {
      key: 'bedrooms',
      header: 'Beds',
      align: 'right' as const,
      render: (row) => row.bedrooms ?? '—',
    },
    {
      key: 'year_built',
      header: 'Year Built',
      align: 'right' as const,
      render: (row) => row.year_built ?? '—',
    },
    {
      key: 'action',
      header: '',
      render: (row) => (
        <button
          onClick={() => router.push(`/re/${row.id}`)}
          className="text-xs text-dl-navy border border-dl-border px-2 py-0.5 bg-dl-bg-alt"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>RE Intelligence – Property Search | Axiom Protocol</title>
        <meta name="description" content="Search property records for deal analysis." />
      </Head>

      <div className="w-full mb-6 overflow-hidden border border-dl-border">
        <div className="relative w-full" style={{ height: '320px' }}>
          <Image
            src="/images/realestate/re_property_search_hero.png"
            alt="RE Intelligence — Property Search"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Real Asset Deployment Layer — RE Intelligence</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">RE Intelligence</h1>
        <p className="text-dl-gray text-sm mb-6">
          Property search and underwriting data layer within the Axiom capital deployment architecture.
          RE Intelligence surfaces property records, comps, and deal metrics that feed directly into
          the Deal Intelligence underwriting workspace and the Land acquisition pipeline.
        </p>
      </div>

      <div className="border border-dl-border mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
          <div className="px-5 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">1 — Identify</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Property Search</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Search the property registry by address, city, state, or ZIP. Each record links directly
              to the full Deal Intelligence underwriting workspace.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">2 — Analyze</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Deal Intelligence</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Selected properties flow into the institutional underwriting workspace — value analysis,
              rehab cost modeling, exit strategies, and deal scoring.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">3 — Acquire</p>
            <p className="font-dl-serif text-sm text-dl-navy mb-1">Land Pipeline</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Qualified acquisitions advance through the six-stage land acquisition pipeline,
              governance approval, and on-chain registration.
            </p>
          </div>
        </div>
      </div>

      <PageShell
        title="Property Search"
        subtitle="Search property records by address, city, state, or ZIP code."
        timestamp={asOf || undefined}
        timestampLabel="Data as of"
      >
        {!walletState.isConnected && (
          <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 text-sm text-dl-gray mb-6">
            Connect your account to access deal intelligence features.
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <FormField label="Address / Keyword">
              <DLInput
                value={q}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                placeholder="e.g. 123 Main St"
              />
            </FormField>
            <FormField label="City">
              <DLInput
                value={city}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                placeholder="e.g. Detroit"
              />
            </FormField>
            <FormField label="State">
              <DLInput
                value={state}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setState(e.target.value)}
                placeholder="e.g. MI"
                maxLength={2}
              />
            </FormField>
            <FormField label="ZIP Code">
              <DLInput
                value={zip}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setZip(e.target.value)}
                placeholder="e.g. 48201"
                maxLength={10}
              />
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <SolidButton type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search Properties'}
            </SolidButton>
            {confidence !== null && (
              <span className="text-xs text-dl-gray font-dl-mono">
                Data confidence: {(confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </form>

        {errorMsg && (
          <div className="border border-dl-error bg-red-50 text-dl-error text-xs px-4 py-3 mb-4">
            {errorMsg}
          </div>
        )}

        {searched && (
          <div className="mb-6">
            <SectionHeading>
              Results {results.length > 0 ? `(${results.length})` : ''}
            </SectionHeading>
            <DataTable
              columns={columns}
              data={results}
              keyExtractor={(r) => r.id}
              emptyMessage="No properties found. Try adjusting your search terms."
            />
          </div>
        )}

        <DisclosureBlock text={RE_DISCLOSURE} />
      </PageShell>
    </DesignLawLayout>
  );
}

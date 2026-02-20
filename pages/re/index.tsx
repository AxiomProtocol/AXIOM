import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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

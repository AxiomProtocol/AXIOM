import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  SectionHeading,
  DetailGrid,
  DisclosureBlock,
  FormField,
  DLInput,
  DLSelect,
  SolidButton,
  StatusBadge,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface SaleRow {
  id: string;
  sale_date: string;
  sale_price: string | null;
  price_per_sqft: string | null;
  buyer: string | null;
  seller: string | null;
  deed_type: string | null;
  is_arms_length: boolean | null;
}

interface TaxRow {
  id: string;
  tax_year: number;
  assessed_total: string | null;
  market_value: string | null;
  tax_amount: string | null;
  tax_rate: string | null;
}

interface FactRow {
  id: string;
  fact_type: string;
  fact_value: string | null;
  fact_numeric: string | null;
  as_of: string | null;
  confidence: string | null;
}

interface Property {
  id: string;
  address_raw: string;
  address_normalized: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  property_type: string | null;
  year_built: number | null;
  sqft: number | null;
  lot_sqft: number | null;
  bedrooms: number | null;
  bathrooms: string | null;
  zoning: string | null;
  apn: string | null;
  lat: string | null;
  lon: string | null;
}

const RE_DISCLOSURE = 'Property data is sourced from internal records and may not reflect current market conditions. Sales history and tax data are provided for informational purposes only. Confidence scores indicate data completeness, not accuracy of any specific value. All deal analysis is probabilistic.';

const STRATEGIES = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];

function fmtCurrency(v: string | null | undefined): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PropertyProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { walletState } = useWallet();

  const [property, setProperty] = useState<Property | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [taxes, setTaxes] = useState<TaxRow[]>([]);
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const [showDealForm, setShowDealForm] = useState(false);
  const [dealName, setDealName] = useState('');
  const [strategy, setStrategy] = useState('hold');
  const [targetPrice, setTargetPrice] = useState('');
  const [dealCreating, setDealCreating] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);

  const loadProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/re/properties/${id}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error?.message || 'Property not found.');
      } else {
        setProperty(json.data.property);
        setSales(json.data.sales || []);
        setTaxes(json.data.taxes || []);
        setFacts(json.data.facts || []);
        setAsOf(json.meta?.as_of || null);
        setConfidence(json.meta?.confidence ?? null);
      }
    } catch {
      setErrorMsg('Network error loading property.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const handleIngest = async () => {
    if (!id) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/re/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setIngestResult(json.error?.message || 'Data fetch failed.');
      } else {
        const written = json.data?.total_records_written ?? 0;
        const warnings: string[] = json.meta?.warnings || [];
        setIngestResult(
          `Fetched ${written} record(s).` +
          (warnings.length > 0 ? ' Note: ' + warnings[0] : '')
        );
        await loadProperty();
      }
    } catch {
      setIngestResult('Network error during data fetch.');
    } finally {
      setIngesting(false);
    }
  };

  const handleCreateDeal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dealName.trim() || !id) return;
    setDealCreating(true);
    setDealError(null);
    try {
      const res = await fetch('/api/re/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: id,
          deal_name: dealName.trim(),
          strategy,
          target_purchase_price: targetPrice ? parseFloat(targetPrice) : null,
          created_by_wallet: walletState.address || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setDealError(json.error?.message || 'Failed to create deal.');
      } else {
        router.push(`/re/deals/${json.data.id}`);
      }
    } catch {
      setDealError('Network error creating deal.');
    } finally {
      setDealCreating(false);
    }
  };

  const saleColumns: Column<SaleRow>[] = [
    { key: 'sale_date', header: 'Sale Date', render: (r) => r.sale_date || '—' },
    { key: 'sale_price', header: 'Sale Price', align: 'right', render: (r) => fmtCurrency(r.sale_price) },
    { key: 'price_per_sqft', header: '$/Sq Ft', align: 'right', render: (r) => fmtCurrency(r.price_per_sqft) },
    { key: 'buyer', header: 'Buyer', render: (r) => r.buyer || '—' },
    { key: 'deed_type', header: 'Deed', render: (r) => r.deed_type || '—' },
    {
      key: 'is_arms_length',
      header: 'Arms Length',
      render: (r) => <StatusBadge status={r.is_arms_length === null ? null : (r.is_arms_length ? 'Yes' : 'No')} />,
    },
  ];

  const taxColumns: Column<TaxRow>[] = [
    { key: 'tax_year', header: 'Year', align: 'right', render: (r) => r.tax_year },
    { key: 'assessed_total', header: 'Assessed Total', align: 'right', render: (r) => fmtCurrency(r.assessed_total) },
    { key: 'market_value', header: 'Market Value', align: 'right', render: (r) => fmtCurrency(r.market_value) },
    { key: 'tax_amount', header: 'Tax Amount', align: 'right', render: (r) => fmtCurrency(r.tax_amount) },
    {
      key: 'tax_rate',
      header: 'Rate',
      align: 'right',
      render: (r) => r.tax_rate ? (parseFloat(r.tax_rate) * 100).toFixed(3) + '%' : '—',
    },
  ];

  const factColumns: Column<FactRow>[] = [
    { key: 'fact_type', header: 'Fact Type', render: (r) => r.fact_type },
    {
      key: 'fact_value',
      header: 'Value',
      render: (r) => r.fact_value || (r.fact_numeric ? parseFloat(r.fact_numeric).toFixed(2) : '—'),
    },
    { key: 'as_of', header: 'As Of', render: (r) => r.as_of || '—' },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      render: (r) => r.confidence ? (parseFloat(r.confidence) * 100).toFixed(0) + '%' : '—',
    },
  ];

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-12 text-sm text-dl-gray">Loading property data...</div>
      </DesignLawLayout>
    );
  }

  if (errorMsg || !property) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-sm text-dl-error mb-4">{errorMsg || 'Property not found.'}</p>
          <Link href="/re" className="text-sm text-dl-navy underline">Back to Search</Link>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>
          {property.address_normalized || property.address_raw} | RE Intelligence | Axiom Protocol
        </title>
        <meta name="description" content="Property profile with sales history and tax data." />
      </Head>
      <PageShell
        title={property.address_normalized || property.address_raw}
        subtitle={[property.city, property.state, property.zip].filter(Boolean).join(', ')}
        timestamp={asOf || undefined}
        timestampLabel="Data as of"
      >
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Link href="/re" className="text-xs text-dl-navy underline">Back to Search</Link>
          {confidence !== null && (
            <span className="text-xs text-dl-gray font-dl-mono">
              Data confidence: {(confidence * 100).toFixed(0)}%
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <SolidButton
              onClick={handleIngest}
              disabled={ingesting}
              variant="secondary"
              size="sm"
            >
              {ingesting ? 'Fetching data...' : 'Fetch Real Data'}
            </SolidButton>
            {ingestResult && (
              <span className="text-xs text-dl-gray font-dl-mono">{ingestResult}</span>
            )}
          </div>
        </div>

        <SectionHeading>Property Details</SectionHeading>
        <DetailGrid
          left={[
            { label: 'Address', value: property.address_normalized || property.address_raw, mono: false },
            { label: 'City', value: property.city },
            { label: 'State', value: property.state },
            { label: 'ZIP', value: property.zip },
            { label: 'County', value: property.county },
            { label: 'Type', value: property.property_type, mono: false },
            { label: 'Zoning', value: property.zoning },
            { label: 'APN', value: property.apn },
          ]}
          right={[
            { label: 'Year Built', value: property.year_built },
            { label: 'Sq Ft', value: property.sqft ? property.sqft.toLocaleString() : null },
            { label: 'Lot Sq Ft', value: property.lot_sqft ? property.lot_sqft.toLocaleString() : null },
            { label: 'Bedrooms', value: property.bedrooms },
            { label: 'Bathrooms', value: property.bathrooms },
            { label: 'Latitude', value: property.lat },
            { label: 'Longitude', value: property.lon },
          ]}
        />

        <div className="mb-8">
          <SectionHeading>Deal Analysis</SectionHeading>
          {!walletState.isConnected ? (
            <p className="text-sm text-dl-gray">Connect your account to create a deal analysis.</p>
          ) : showDealForm ? (
            <form onSubmit={handleCreateDeal} className="border border-dl-border bg-dl-bg-alt p-4 max-w-lg">
              <div className="grid grid-cols-1 gap-3 mb-3">
                <FormField label="Deal Name">
                  <DLInput
                    value={dealName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDealName(e.target.value)}
                    placeholder="e.g. 123 Main — BRRRR Analysis"
                    required
                  />
                </FormField>
                <FormField label="Strategy">
                  <DLSelect
                    value={strategy}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setStrategy(e.target.value)}
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </DLSelect>
                </FormField>
                <FormField label="Target Purchase Price (optional)">
                  <DLInput
                    value={targetPrice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetPrice(e.target.value)}
                    placeholder="e.g. 150000"
                    type="number"
                    min="0"
                  />
                </FormField>
              </div>
              {dealError && (
                <p className="text-xs text-dl-error mb-3">{dealError}</p>
              )}
              <div className="flex gap-3">
                <SolidButton type="submit" disabled={dealCreating}>
                  {dealCreating ? 'Creating...' : 'Create Deal'}
                </SolidButton>
                <SolidButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDealForm(false)}
                >
                  Cancel
                </SolidButton>
              </div>
            </form>
          ) : (
            <SolidButton onClick={() => setShowDealForm(true)}>
              Create Deal Analysis
            </SolidButton>
          )}
        </div>

        {sales.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Sale History ({sales.length})</SectionHeading>
            <DataTable
              columns={saleColumns}
              data={sales}
              keyExtractor={(r) => r.id}
              emptyMessage="No sale records available."
            />
          </div>
        )}

        {taxes.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Tax Assessment History ({taxes.length})</SectionHeading>
            <DataTable
              columns={taxColumns}
              data={taxes}
              keyExtractor={(r) => r.id}
              emptyMessage="No tax records available."
            />
          </div>
        )}

        {facts.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Property Facts ({facts.length})</SectionHeading>
            <DataTable
              columns={factColumns}
              data={facts}
              keyExtractor={(r) => r.id}
              emptyMessage="No property facts recorded."
            />
          </div>
        )}

        <DisclosureBlock text={RE_DISCLOSURE} />
      </PageShell>
    </DesignLawLayout>
  );
}

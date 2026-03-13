import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';

interface PropertyProfile {
  property: Record<string, any>;
  sales: Array<Record<string, any>>;
  taxes: Array<Record<string, any>>;
  facts: Array<Record<string, any>>;
}

const STRATEGIES = [
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'flip', label: 'Flip' },
  { value: 'hold', label: 'Buy and Hold' },
  { value: 'note', label: 'Note' },
  { value: 'multifamily', label: 'Multifamily' },
];

export default function PropertyProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<PropertyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState('hold');
  const [creating, setCreating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const loadProperty = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/real-estate/properties/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error.message);
        else setProfile(json.data);
      })
      .catch(() => setError('Failed to load property'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadProperty(); }, [loadProperty]);

  const handleEnrich = useCallback(async () => {
    if (!id) return;
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/real-estate/properties/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      const json = await res.json();
      if (json.error) {
        setEnrichResult(json.error.message);
      } else {
        const d = json.data;
        setEnrichResult(`Enriched: ${d.fields_updated?.length || 0} fields, ${d.sales_added || 0} sales, ${d.taxes_added || 0} tax records, ${d.facts_added || 0} facts`);
        loadProperty();
      }
    } catch {
      setEnrichResult('Failed to enrich property');
    } finally {
      setEnriching(false);
    }
  }, [id, loadProperty]);

  const handleCreateDeal = useCallback(async () => {
    if (!id) return;
    setCreating(true);
    try {
      const res = await fetch('/api/real-estate/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id, strategy }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else if (json.data?.deal?.id) {
        router.push(`/deal-intelligence/deal/${json.data.deal.id}`);
      }
    } catch {
      setError('Failed to create deal');
    } finally {
      setCreating(false);
    }
  }, [id, strategy, router]);

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-dl-muted font-dl-mono text-sm">Loading property...</p>
        </div>
      </DesignLawLayout>
    );
  }

  if (error || !profile) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="border border-red-300 bg-red-50 p-4">
            <p className="text-red-700 font-dl-mono text-sm">{error || 'Property not found'}</p>
          </div>
          <Link href="/deal-intelligence" className="inline-block mt-4 text-dl-navy font-dl-mono text-sm underline">
            Back to Search
          </Link>
        </div>
      </DesignLawLayout>
    );
  }

  const { property, sales, taxes, facts } = profile;
  const hasData = property.sqft || property.bedrooms || property.yearBuilt;

  return (
    <DesignLawLayout>
      <Head>
        <title>{property.addressRaw || 'Property'} | Deal Intelligence | AXIOM</title>
      </Head>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link href="/deal-intelligence" className="text-dl-navy font-dl-mono text-sm underline hover:no-underline">
            Back to Search
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-dl-serif text-xl sm:text-2xl text-dl-navy mb-1">{property.addressRaw || property.addressNormalized}</h1>
            <p className="text-dl-muted font-dl-mono text-sm">
              {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
              {property.county ? ` | ${property.county} County` : ''}
            </p>
          </div>
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="border border-dl-navy text-dl-navy px-4 py-2 min-h-[44px] font-dl-mono text-xs hover:bg-dl-navy hover:text-white disabled:opacity-50 shrink-0"
          >
            {enriching ? 'Fetching Data...' : hasData ? 'Refresh Data' : 'Fetch Property Data'}
          </button>
        </div>

        {enrichResult && (
          <div className={`border p-3 mb-6 font-dl-mono text-xs ${enrichResult.startsWith('Enriched') ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
            {enrichResult}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="border border-dl-border p-6 mb-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Type', value: property.propertyType?.replace(/_/g, ' ') || '-' },
                  { label: 'Sqft', value: property.sqft?.toLocaleString() || '-' },
                  { label: 'Lot Sqft', value: property.lotSqft?.toLocaleString() || '-' },
                  { label: 'Year Built', value: property.yearBuilt || '-' },
                  { label: 'Bedrooms', value: property.bedrooms ?? '-' },
                  { label: 'Bathrooms', value: property.bathrooms ?? '-' },
                  { label: 'Stories', value: property.stories || '-' },
                  { label: 'Garage', value: property.garage || '-' },
                  { label: 'Pool', value: property.pool ? 'Yes' : 'No' },
                  { label: 'Zoning', value: property.zoning || '-' },
                  { label: 'FIPS', value: property.fips || '-' },
                  { label: 'APN', value: property.apn || '-' },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="block text-xs font-dl-mono text-dl-muted uppercase">{item.label}</span>
                    <span className="block font-dl-mono text-sm text-dl-text">{item.value}</span>
                  </div>
                ))}
              </div>
              {property.lat && property.lon && (
                <div className="mt-4 pt-4 border-t border-dl-border">
                  <span className="text-xs font-dl-mono text-dl-muted uppercase">Coordinates: </span>
                  <span className="font-dl-mono text-sm text-dl-text">{property.lat}, {property.lon}</span>
                </div>
              )}
              {property.meta?.rentcast && (
                <div className="mt-4 pt-4 border-t border-dl-border grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.meta.rentcast.subdivision && (
                    <div>
                      <span className="block text-xs font-dl-mono text-dl-muted uppercase">Subdivision</span>
                      <span className="block font-dl-mono text-sm text-dl-text">{property.meta.rentcast.subdivision}</span>
                    </div>
                  )}
                  {property.meta.rentcast.legalDescription && (
                    <div className="col-span-2">
                      <span className="block text-xs font-dl-mono text-dl-muted uppercase">Legal Description</span>
                      <span className="block font-dl-mono text-sm text-dl-text">{property.meta.rentcast.legalDescription}</span>
                    </div>
                  )}
                  {property.meta.rentcast.hoa?.fee && (
                    <div>
                      <span className="block text-xs font-dl-mono text-dl-muted uppercase">HOA Fee</span>
                      <span className="block font-dl-mono text-sm text-dl-text">${property.meta.rentcast.hoa.fee}/mo</span>
                    </div>
                  )}
                  {property.meta.rentcast.enrichedAt && (
                    <div>
                      <span className="block text-xs font-dl-mono text-dl-muted uppercase">Data As Of</span>
                      <span className="block font-dl-mono text-sm text-dl-text">{new Date(property.meta.rentcast.enrichedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {sales.length > 0 && (
              <div className="border border-dl-border p-4 sm:p-6 mb-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Sale History ({sales.length})</h2>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Date</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Price</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">$/Sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale: any) => (
                        <tr key={sale.id} className="border-b border-dl-border">
                          <td className="px-2 py-2 font-dl-mono text-sm">{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : '-'}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{sale.salePrice ? `$${Number(sale.salePrice).toLocaleString()}` : '-'}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{sale.pricePerSqft ? `$${Number(sale.pricePerSqft).toFixed(0)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden grid grid-cols-1 gap-3">
                  {sales.map((sale: any) => (
                    <div key={sale.id} className="border border-dl-border p-3">
                      <div className="grid grid-cols-3 gap-2 text-xs font-dl-mono">
                        <div><span className="text-dl-muted block">Date</span>{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : '-'}</div>
                        <div><span className="text-dl-muted block">Price</span>{sale.salePrice ? `$${Number(sale.salePrice).toLocaleString()}` : '-'}</div>
                        <div><span className="text-dl-muted block">$/SqFt</span>{sale.pricePerSqft ? `$${Number(sale.pricePerSqft).toFixed(0)}` : '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {taxes.length > 0 && (
              <div className="border border-dl-border p-4 sm:p-6 mb-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Tax History ({taxes.length})</h2>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Year</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Assessed</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Tax Amount</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Land</th>
                        <th className="text-left px-2 py-1 font-dl-mono text-xs text-dl-muted uppercase">Improvements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxes.map((tax: any) => (
                        <tr key={tax.id} className="border-b border-dl-border">
                          <td className="px-2 py-2 font-dl-mono text-sm">{tax.taxYear}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{tax.assessedTotal ? `$${Number(tax.assessedTotal).toLocaleString()}` : '-'}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{tax.taxAmount ? `$${Number(tax.taxAmount).toLocaleString()}` : '-'}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{tax.assessedLand ? `$${Number(tax.assessedLand).toLocaleString()}` : '-'}</td>
                          <td className="px-2 py-2 font-dl-mono text-sm">{tax.assessedImprovement ? `$${Number(tax.assessedImprovement).toLocaleString()}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {taxes.map((tax: any) => (
                    <div key={tax.id} className="border border-dl-border p-3">
                      <div className="font-dl-mono text-sm text-dl-navy font-bold mb-2">{tax.taxYear}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                        <div><span className="text-dl-muted block">Assessed</span>{tax.assessedTotal ? `$${Number(tax.assessedTotal).toLocaleString()}` : '-'}</div>
                        <div><span className="text-dl-muted block">Tax</span>{tax.taxAmount ? `$${Number(tax.taxAmount).toLocaleString()}` : '-'}</div>
                        <div><span className="text-dl-muted block">Land</span>{tax.assessedLand ? `$${Number(tax.assessedLand).toLocaleString()}` : '-'}</div>
                        <div><span className="text-dl-muted block">Improvements</span>{tax.assessedImprovement ? `$${Number(tax.assessedImprovement).toLocaleString()}` : '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {facts.length > 0 && (
              <div className="border border-dl-border p-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Property Facts ({facts.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {facts.map((fact: any) => (
                    <div key={fact.id}>
                      <span className="block text-xs font-dl-mono text-dl-muted uppercase">{fact.factType?.replace(/_/g, ' ')}</span>
                      <span className="block font-dl-mono text-sm text-dl-text">{fact.factValue || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasData && sales.length === 0 && taxes.length === 0 && facts.length === 0 && (
              <div className="border border-dl-border p-6 text-center">
                <p className="text-dl-muted font-dl-mono text-sm mb-2">No property data available yet.</p>
                <p className="text-dl-muted font-dl-mono text-xs">Click "Fetch Property Data" above to pull details from public records.</p>
              </div>
            )}
          </div>

          <div>
            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Start Deal Analysis</h2>
              <p className="text-dl-muted font-dl-mono text-xs mb-4">
                Select a strategy and create a deal workspace to run underwriting scenarios.
              </p>

              <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white text-dl-text mb-4 focus:outline-none focus:border-dl-navy"
              >
                {STRATEGIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <button
                onClick={handleCreateDeal}
                disabled={creating}
                className="w-full bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm hover:bg-dl-navy/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Deal Workspace'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}

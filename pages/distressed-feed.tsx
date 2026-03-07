import { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

type Tab = 'feed' | 'submit' | 'buybox';

interface Listing {
  id: string;
  source: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: string | null;
  sqft: number | null;
  yearBuilt: number | null;
  listPrice: string;
  estimatedValue: string | null;
  discountPct: string | null;
  distressType: string;
  sourceUrl: string | null;
  description: string | null;
  auctionDate: string | null;
  ingestedAt: string;
  status: string;
}

interface FeedStats {
  totalActive: number;
  totalExpired: number;
  bySource: Record<string, number>;
  byDistressType: Record<string, number>;
  byState: Record<string, number>;
  lastIngestion: string | null;
}

const DISTRESS_LABELS: Record<string, string> = {
  foreclosure: 'Foreclosure',
  tax_lien: 'Tax Lien',
  reo: 'REO',
  wholesale: 'Wholesale',
  short_sale: 'Short Sale',
  auction: 'Auction',
  government: 'Government',
};

const SOURCE_LABELS: Record<string, string> = {
  hud: 'HUD',
  fannie_mae: 'Fannie Mae',
  freddie_mac: 'Freddie Mac',
  usda: 'USDA',
  wholesaler: 'Wholesaler',
  tax_sale: 'Tax Sale',
  manual: 'Manual',
};

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'manufactured', label: 'Manufactured' },
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return '--';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function FeedTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDistressType, setFilterDistressType] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort_by: sortBy });
      if (filterState) params.set('state', filterState);
      if (filterCity) params.set('city', filterCity);
      if (filterDistressType) params.set('distress_type', filterDistressType);
      if (filterPropertyType) params.set('property_type', filterPropertyType);
      if (filterMinPrice) params.set('min_price', filterMinPrice);
      if (filterMaxPrice) params.set('max_price', filterMaxPrice);

      const res = await fetch(`/api/distressed-feed/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, filterState, filterCity, filterDistressType, filterPropertyType, filterMinPrice, filterMaxPrice]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    fetch('/api/distressed-feed/stats')
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="border border-[#2c3e50] p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-3">FEED STATISTICS</h3>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Active Listings</div>
              <div className="font-mono text-xl text-[#2c3e50]">{stats.totalActive}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Sources Active</div>
              <div className="font-mono text-xl text-[#2c3e50]">{Object.keys(stats.bySource).length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">States Covered</div>
              <div className="font-mono text-xl text-[#2c3e50]">{Object.keys(stats.byState).length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Last Ingestion</div>
              <div className="font-mono text-sm text-[#2c3e50]">
                {stats.lastIngestion ? new Date(stats.lastIngestion).toLocaleDateString() : 'None'}
              </div>
            </div>
          </div>
        ) : (
          <div className="font-mono text-sm text-[#5a6c7d]">Loading statistics...</div>
        )}
      </div>

      <div className="border border-[#2c3e50] p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-3">FILTERS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">State</label>
            <select
              value={filterState}
              onChange={e => { setFilterState(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            >
              <option value="">All States</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">City</label>
            <input
              type="text"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              onBlur={() => setPage(1)}
              placeholder="Any city"
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Distress Type</label>
            <select
              value={filterDistressType}
              onChange={e => { setFilterDistressType(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            >
              <option value="">All Types</option>
              {Object.entries(DISTRESS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Type</label>
            <select
              value={filterPropertyType}
              onChange={e => { setFilterPropertyType(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            >
              <option value="">All</option>
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Price</label>
            <input
              type="number"
              value={filterMinPrice}
              onChange={e => setFilterMinPrice(e.target.value)}
              onBlur={() => setPage(1)}
              placeholder="0"
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Max Price</label>
            <input
              type="number"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
              onBlur={() => setPage(1)}
              placeholder="No limit"
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount_desc">Highest Discount</option>
              <option value="auction_date">Auction Date</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-3 flex justify-between items-center">
        <div className="font-mono text-sm text-[#5a6c7d]">{total} listings found</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-[#2c3e50] px-3 py-1 font-mono text-sm disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-mono text-sm py-1">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-[#2c3e50] px-3 py-1 font-mono text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className="border border-[#2c3e50] p-8 text-center font-mono text-[#5a6c7d]">
          Loading distressed property feed...
        </div>
      ) : listings.length === 0 ? (
        <div className="border border-[#2c3e50] p-8 text-center">
          <div className="font-serif text-lg text-[#2c3e50] mb-2">No Listings Found</div>
          <div className="font-mono text-sm text-[#5a6c7d]">
            Adjust your filters or trigger an ingestion to populate the feed.
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {listings.map(listing => (
            <div key={listing.id} className="border border-[#2c3e50] border-b-0 last:border-b">
              <div
                className="p-4 cursor-pointer hover:bg-[#f5f0e8]"
                onClick={() => setExpanded(expanded === listing.id ? null : listing.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-serif text-[#2c3e50]">
                      {listing.address}
                    </div>
                    <div className="font-mono text-sm text-[#5a6c7d]">
                      {listing.city}, {listing.state} {listing.zip}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <div className="font-mono text-lg text-[#2c3e50]">{formatCurrency(listing.listPrice)}</div>
                      {listing.discountPct && Number(listing.discountPct) > 0 && (
                        <div className="font-mono text-xs text-[#2d5016]">
                          {Number(listing.discountPct).toFixed(1)}% below value
                        </div>
                      )}
                    </div>
                    <div className="border border-[#2c3e50] px-2 py-0.5">
                      <span className="font-mono text-xs uppercase">{DISTRESS_LABELS[listing.distressType] || listing.distressType}</span>
                    </div>
                    <div className="border border-[#5a6c7d] px-2 py-0.5">
                      <span className="font-mono text-xs text-[#5a6c7d] uppercase">{SOURCE_LABELS[listing.source] || listing.source}</span>
                    </div>
                  </div>
                </div>
              </div>

              {expanded === listing.id && (
                <div className="border-t border-[#2c3e50] p-4 bg-[#faf8f4]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Property Type</div>
                      <div className="font-mono text-sm">
                        {PROPERTY_TYPES.find(t => t.value === listing.propertyType)?.label || listing.propertyType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Bedrooms</div>
                      <div className="font-mono text-sm">{listing.bedrooms || '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Bathrooms</div>
                      <div className="font-mono text-sm">{listing.bathrooms || '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Sq Ft</div>
                      <div className="font-mono text-sm">{listing.sqft?.toLocaleString() || '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Year Built</div>
                      <div className="font-mono text-sm">{listing.yearBuilt || '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">List Price</div>
                      <div className="font-mono text-sm">{formatCurrency(listing.listPrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Estimated Value</div>
                      <div className="font-mono text-sm">{formatCurrency(listing.estimatedValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Ingested</div>
                      <div className="font-mono text-sm">{new Date(listing.ingestedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {listing.description && (
                    <div className="mb-4">
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Description</div>
                      <div className="font-mono text-sm text-[#2c3e50]">{listing.description}</div>
                    </div>
                  )}
                  {listing.auctionDate && (
                    <div className="mb-4">
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Auction Date</div>
                      <div className="font-mono text-sm text-[#8b6914]">{new Date(listing.auctionDate).toLocaleDateString()}</div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {listing.sourceUrl && (
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-[#2c3e50] px-4 py-2 font-mono text-sm hover:bg-[#2c3e50] hover:text-white transition-colors"
                      >
                        View Source
                      </a>
                    )}
                    <a
                      href={`/deal-intelligence?address=${encodeURIComponent(listing.address + ', ' + listing.city + ', ' + listing.state + ' ' + listing.zip)}`}
                      className="border border-[#2d5016] text-[#2d5016] px-4 py-2 font-mono text-sm hover:bg-[#2d5016] hover:text-white transition-colors"
                    >
                      Analyze with Deal Intelligence
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitTab() {
  const [form, setForm] = useState({
    submitterName: '',
    submitterEmail: '',
    submitterPhone: '',
    propertyAddress: '',
    city: '',
    state: '',
    zip: '',
    askingPrice: '',
    arv: '',
    rehabEstimate: '',
    propertyType: 'single_family',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    yearBuilt: '',
    description: '',
    contractEndDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        submitterName: form.submitterName,
        submitterEmail: form.submitterEmail,
        submitterPhone: form.submitterPhone || undefined,
        propertyAddress: form.propertyAddress,
        city: form.city,
        state: form.state.toUpperCase(),
        zip: form.zip,
        askingPrice: parseFloat(form.askingPrice),
        arv: form.arv ? parseFloat(form.arv) : undefined,
        rehabEstimate: form.rehabEstimate ? parseFloat(form.rehabEstimate) : undefined,
        propertyType: form.propertyType,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : undefined,
        sqft: form.sqft ? parseInt(form.sqft) : undefined,
        yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : undefined,
        description: form.description || undefined,
        contractEndDate: form.contractEndDate || undefined,
      };

      const res = await fetch('/api/distressed-feed/wholesale/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message });
        setForm({
          submitterName: '', submitterEmail: '', submitterPhone: '',
          propertyAddress: '', city: '', state: '', zip: '',
          askingPrice: '', arv: '', rehabEstimate: '',
          propertyType: 'single_family', bedrooms: '', bathrooms: '',
          sqft: '', yearBuilt: '', description: '', contractEndDate: '',
        });
      } else {
        setResult({ success: false, message: data.error || 'Submission failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="border border-[#2c3e50] p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-2">WHOLESALER DEAL SUBMISSION</h3>
        <p className="font-mono text-sm text-[#5a6c7d]">
          Submit off-market or wholesale deals to the Axiom Deal Flow pipeline.
          Approved deals are listed in the feed and matched to active investor buy boxes.
          No account required. Review within 48 hours.
        </p>
      </div>

      {result && (
        <div className={`border p-4 mb-6 ${result.success ? 'border-[#2d5016] bg-[#f0f5ec]' : 'border-[#8b1a1a] bg-[#fdf0f0]'}`}>
          <div className="font-mono text-sm">{result.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border border-[#2c3e50] p-4">
        <h4 className="font-serif text-[#2c3e50] mb-4">YOUR INFORMATION</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Name *</label>
            <input type="text" required value={form.submitterName} onChange={e => updateField('submitterName', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Email *</label>
            <input type="email" required value={form.submitterEmail} onChange={e => updateField('submitterEmail', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Phone</label>
            <input type="tel" value={form.submitterPhone} onChange={e => updateField('submitterPhone', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
        </div>

        <h4 className="font-serif text-[#2c3e50] mb-4">PROPERTY DETAILS</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Address *</label>
            <input type="text" required value={form.propertyAddress} onChange={e => updateField('propertyAddress', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">City *</label>
            <input type="text" required value={form.city} onChange={e => updateField('city', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">State *</label>
              <select required value={form.state} onChange={e => updateField('state', e.target.value)}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm">
                <option value="">--</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">ZIP *</label>
              <input type="text" required value={form.zip} onChange={e => updateField('zip', e.target.value)}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Type</label>
            <select value={form.propertyType} onChange={e => updateField('propertyType', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm">
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Bedrooms</label>
            <input type="number" value={form.bedrooms} onChange={e => updateField('bedrooms', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Bathrooms</label>
            <input type="number" step="0.5" value={form.bathrooms} onChange={e => updateField('bathrooms', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Sq Ft</label>
            <input type="number" value={form.sqft} onChange={e => updateField('sqft', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Year Built</label>
            <input type="number" value={form.yearBuilt} onChange={e => updateField('yearBuilt', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
        </div>

        <h4 className="font-serif text-[#2c3e50] mb-4">DEAL NUMBERS</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Asking Price *</label>
            <input type="number" required value={form.askingPrice} onChange={e => updateField('askingPrice', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">ARV (After Repair Value)</label>
            <input type="number" value={form.arv} onChange={e => updateField('arv', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Rehab Estimate</label>
            <input type="number" value={form.rehabEstimate} onChange={e => updateField('rehabEstimate', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Description</label>
            <textarea value={form.description} onChange={e => updateField('description', e.target.value)}
              rows={3} className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Contract End Date</label>
            <input type="date" value={form.contractEndDate} onChange={e => updateField('contractEndDate', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="border border-[#2c3e50] bg-[#2c3e50] text-white px-6 py-2 font-mono text-sm hover:bg-[#1a2a36] disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Deal'}
        </button>
      </form>
    </div>
  );
}

function BuyBoxTab() {
  const [wallet, setWallet] = useState('');
  const [buyBoxes, setBuyBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    targetStates: [] as string[],
    targetCities: '',
    minPrice: '',
    maxPrice: '',
    propertyTypes: [] as string[],
    distressTypes: [] as string[],
    minBedrooms: '',
    minSqft: '',
    maxPricePerSqft: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setWallet(accounts[0]);
        })
        .catch(() => {});
    }
  }, []);

  const fetchBuyBoxes = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/distressed-feed/buy-boxes?wallet=${wallet}`);
      const data = await res.json();
      setBuyBoxes(data.buyBoxes || []);
    } catch {
      setBuyBoxes([]);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchBuyBoxes();
  }, [fetchBuyBoxes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setCreating(true);
    try {
      const body = {
        userWallet: wallet,
        name: form.name,
        targetStates: form.targetStates,
        targetCities: form.targetCities ? form.targetCities.split(',').map(c => c.trim()).filter(Boolean) : [],
        minPrice: form.minPrice ? parseFloat(form.minPrice) : undefined,
        maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
        propertyTypes: form.propertyTypes,
        distressTypes: form.distressTypes,
        minBedrooms: form.minBedrooms ? parseInt(form.minBedrooms) : undefined,
        minSqft: form.minSqft ? parseInt(form.minSqft) : undefined,
        maxPricePerSqft: form.maxPricePerSqft ? parseFloat(form.maxPricePerSqft) : undefined,
      };

      const res = await fetch('/api/distressed-feed/buy-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowCreate(false);
        setForm({
          name: '', targetStates: [], targetCities: '', minPrice: '', maxPrice: '',
          propertyTypes: [], distressTypes: [], minBedrooms: '', minSqft: '', maxPricePerSqft: '',
        });
        fetchBuyBoxes();
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const toggleArrayItem = (field: 'targetStates' | 'propertyTypes' | 'distressTypes', item: string) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] };
    });
  };

  const deleteBuyBox = async (id: string) => {
    try {
      await fetch(`/api/distressed-feed/buy-boxes/${id}`, { method: 'DELETE' });
      fetchBuyBoxes();
    } catch { /* ignore */ }
  };

  if (!wallet) {
    return (
      <div className="border border-[#2c3e50] p-8 text-center">
        <div className="font-serif text-lg text-[#2c3e50] mb-2">Connect Wallet</div>
        <div className="font-mono text-sm text-[#5a6c7d]">
          Connect your wallet to create and manage buy boxes.
          Buy boxes define your investment criteria and automatically match you with deals in the feed.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-[#2c3e50] p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-2">INVESTOR BUY BOX</h3>
        <p className="font-mono text-sm text-[#5a6c7d]">
          Define your investment criteria. When new deals enter the feed that match your buy box, they are
          automatically scored and queued for your review. Set price ranges, target markets, property types,
          and distress categories.
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="font-mono text-sm text-[#5a6c7d]">
          Wallet: {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="border border-[#2c3e50] px-4 py-1.5 font-mono text-sm hover:bg-[#2c3e50] hover:text-white"
        >
          {showCreate ? 'Cancel' : 'New Buy Box'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border border-[#2c3e50] p-4 mb-6">
          <h4 className="font-serif text-[#2c3e50] mb-4">CREATE BUY BOX</h4>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Atlanta SFR Under 200K"
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Target States</label>
            <div className="flex flex-wrap gap-1">
              {['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL'].map(s => (
                <button key={s} type="button"
                  onClick={() => toggleArrayItem('targetStates', s)}
                  className={`border px-2 py-0.5 font-mono text-xs ${form.targetStates.includes(s) ? 'border-[#2c3e50] bg-[#2c3e50] text-white' : 'border-[#5a6c7d] text-[#5a6c7d]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Target Cities (comma-separated)</label>
            <input type="text" value={form.targetCities} onChange={e => setForm(p => ({ ...p, targetCities: e.target.value }))}
              placeholder="e.g., Atlanta, Houston, Charlotte"
              className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Price</label>
              <input type="number" value={form.minPrice} onChange={e => setForm(p => ({ ...p, minPrice: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Max Price</label>
              <input type="number" value={form.maxPrice} onChange={e => setForm(p => ({ ...p, maxPrice: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Bedrooms</label>
              <input type="number" value={form.minBedrooms} onChange={e => setForm(p => ({ ...p, minBedrooms: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Sq Ft</label>
              <input type="number" value={form.minSqft} onChange={e => setForm(p => ({ ...p, minSqft: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Max $/Sq Ft</label>
              <input type="number" value={form.maxPricePerSqft} onChange={e => setForm(p => ({ ...p, maxPricePerSqft: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-2 py-1.5 font-mono text-sm" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Types</label>
            <div className="flex flex-wrap gap-1">
              {PROPERTY_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => toggleArrayItem('propertyTypes', t.value)}
                  className={`border px-2 py-0.5 font-mono text-xs ${form.propertyTypes.includes(t.value) ? 'border-[#2c3e50] bg-[#2c3e50] text-white' : 'border-[#5a6c7d] text-[#5a6c7d]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Distress Types</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(DISTRESS_LABELS).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => toggleArrayItem('distressTypes', k)}
                  className={`border px-2 py-0.5 font-mono text-xs ${form.distressTypes.includes(k) ? 'border-[#2c3e50] bg-[#2c3e50] text-white' : 'border-[#5a6c7d] text-[#5a6c7d]'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={creating}
            className="border border-[#2c3e50] bg-[#2c3e50] text-white px-6 py-2 font-mono text-sm hover:bg-[#1a2a36] disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Buy Box'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="border border-[#2c3e50] p-8 text-center font-mono text-[#5a6c7d]">Loading buy boxes...</div>
      ) : buyBoxes.length === 0 ? (
        <div className="border border-[#2c3e50] p-8 text-center">
          <div className="font-serif text-lg text-[#2c3e50] mb-2">No Buy Boxes</div>
          <div className="font-mono text-sm text-[#5a6c7d]">
            Create a buy box to start receiving matched deals from the feed.
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {buyBoxes.map((box: any) => (
            <div key={box.id} className="border border-[#2c3e50] border-b-0 last:border-b p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-serif text-[#2c3e50]">{box.name}</div>
                  <div className="font-mono text-sm text-[#5a6c7d] mt-1">
                    {((box.targetStates as string[]) || []).length > 0 && (
                      <span>States: {(box.targetStates as string[]).join(', ')} | </span>
                    )}
                    {box.minPrice && <span>Min: {formatCurrency(box.minPrice)} | </span>}
                    {box.maxPrice && <span>Max: {formatCurrency(box.maxPrice)} | </span>}
                    {((box.propertyTypes as string[]) || []).length > 0 && (
                      <span>Types: {(box.propertyTypes as string[]).join(', ')}</span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-[#5a6c7d] mt-1">
                    Created: {new Date(box.createdAt).toLocaleDateString()}
                    {' | '}Status: {box.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <button
                  onClick={() => deleteBuyBox(box.id)}
                  className="border border-[#8b1a1a] text-[#8b1a1a] px-3 py-1 font-mono text-xs hover:bg-[#8b1a1a] hover:text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DistressedFeedPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Property Feed' },
    { id: 'submit', label: 'Submit Deal' },
    { id: 'buybox', label: 'My Buy Box' },
  ];

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#2c3e50] mb-2">DEAL FLOW</h1>
          <h2 className="font-serif text-xl text-[#5a6c7d] mb-4">Distressed Property Acquisition Pipeline</h2>
          <p className="font-mono text-sm text-[#5a6c7d] max-w-3xl">
            Aggregated feed of distressed, foreclosed, REO, and wholesale properties from government
            agencies and verified wholesalers. Each listing can be instantly analyzed through Deal Intelligence
            for institutional-grade underwriting. Set your buy box criteria to receive matched deals automatically.
          </p>
        </div>

        <div className="flex border-b border-[#2c3e50] mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-mono text-sm border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[#2c3e50] text-[#2c3e50]'
                  : 'border-transparent text-[#5a6c7d] hover:text-[#2c3e50]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'submit' && <SubmitTab />}
        {activeTab === 'buybox' && <BuyBoxTab />}
      </div>
    </DesignLawLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Image from 'next/image';

type Tab = 'feed' | 'mls' | 'submit' | 'buybox';

interface AttomMeta {
  filingType?: string;
  nodDate?: string;
  defaultAmount?: number;
  lenderName?: string;
  auctionOpeningBid?: number;
  totalDebt?: number;
}

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
  photos: string[] | null;
  metadata: AttomMeta | null;
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
  pre_foreclosure: 'Pre-Foreclosure',
  lis_pendens: 'Lis Pendens',
};

const SOURCE_LABELS: Record<string, string> = {
  hud: 'HUD',
  fannie_mae: 'Fannie Mae',
  freddie_mac: 'Freddie Mac',
  usda: 'USDA',
  wholesaler: 'Wholesaler',
  tax_sale: 'Tax Sale',
  sheriff_sale: 'Sheriff Sale',
  manual: 'Manual',
  attom: 'ATTOM',
  courthouse: 'Courthouse',
  mls_repliers: 'MLS via Repliers',
};

interface SourceStatusInfo {
  name: string;
  state: string;
  url: string;
  status: 'active' | 'unavailable' | 'blocked' | 'manual_only';
  statusReason: string;
  frequency: string;
  lastAttempt: string;
}

type SourceAccessStatus = 'active' | 'api_key_required' | 'service_offline' | 'api_blocked' | 'no_public_api' | 'js_rendered';

interface SourceStatusEntry {
  source: string;
  name: string;
  accessStatus: SourceAccessStatus;
  reason: string;
  note?: string;
  inventoryHint?: string;
  lastChecked: string;
}

const SOURCE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-[#f0f5ec]', text: 'text-[#2d5016]', label: 'Active' },
  unavailable: { bg: 'bg-[#fdf0f0]', text: 'text-[#8b1a1a]', label: 'Unavailable' },
  blocked: { bg: 'bg-[#fff8e1]', text: 'text-[#8b6914]', label: 'Blocked' },
  manual_only: { bg: 'bg-[#f0f0f5]', text: 'text-[#5a5a7d]', label: 'Manual Only' },
};

const GOVERNMENT_SOURCES = [
  { name: 'HUD HomeStore', type: 'hud', status: 'active' as const, description: 'HUD foreclosed properties via hudhomestore.gov API' },
  { name: 'Fannie Mae HomePath', type: 'fannie_mae', status: 'active' as const, description: 'Fannie Mae REO properties via HomePath' },
  { name: 'Freddie Mac HomeSteps', type: 'freddie_mac', status: 'active' as const, description: 'Freddie Mac REO properties via HomeSteps' },
  { name: 'USDA Rural Development', type: 'usda', status: 'active' as const, description: 'USDA foreclosed rural properties' },
  { name: 'ATTOM Pre-Foreclosure', type: 'attom', status: 'active' as const, description: 'ATTOM pre-foreclosure filings: NOD, Lis Pendens, Notice of Trustee Sale (90-day lookback)' },
];

const EXPANSION_SOURCES = [
  { name: 'Courthouse Public Records', type: 'courthouse', states: ['GA', 'FL', 'TX', 'AZ', 'MI', 'NC', 'AL', 'MS', 'TN', 'SC'], status: 'active' as const, description: 'Public foreclosure filings, lis pendens, and tax forfeitures scraped from county courthouses and state registries across all 10 target states' },
  { name: 'County Tax Lien Auctions', type: 'tax_sale', states: ['GA', 'FL', 'TX', 'AZ', 'MI', 'NC', 'AL', 'MS', 'TN', 'SC'], status: 'active' as const, description: 'County tax lien/deed sales — government delinquent tax auctions' },
  { name: 'Sheriff / Trustee Sales', type: 'sheriff_sale', states: ['GA', 'TX', 'NC'], status: 'active' as const, description: 'Sheriff sales and trustee foreclosure auctions — county courthouse sales' },
];

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
  const [sourceStatus, setSourceStatus] = useState<SourceStatusEntry[] | null>(null);
  const [sourceStatusLoading, setSourceStatusLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDistressType, setFilterDistressType] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  async function promoteToDeal(listingId: string) {
    setPromoting(listingId);
    setPromoteError(null);
    try {
      const res = await fetch(`/api/distressed-feed/listings/${listingId}/promote-to-deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'brrrr' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create deal');
      window.location.href = `/deal-intelligence/deal/${data.dealId}`;
    } catch (err: unknown) {
      setPromoteError(err instanceof Error ? err.message : 'Failed to create deal');
      setPromoting(null);
    }
  }

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

  function checkSourceStatus() {
    setSourceStatusLoading(true);
    fetch('/api/distressed-feed/source-status')
      .then(r => r.json())
      .then(d => setSourceStatus(d.sources || []))
      .catch(() => setSourceStatus([]))
      .finally(() => setSourceStatusLoading(false));
  }

  return (
    <div>
      <div className="border border-[#2c3e50] p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-3">FEED STATISTICS</h3>
        {stats ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
            {Object.keys(stats.bySource).length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-2">Listings by Source</div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.bySource).map(([src, count]) => (
                    <div key={src} className="border border-[#2c3e50] px-3 py-1.5">
                      <span className="font-mono text-xs uppercase text-[#5a6c7d]">{SOURCE_LABELS[src] || src}</span>
                      <span className="font-mono text-sm text-[#2c3e50] ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="font-mono text-sm text-[#5a6c7d]">Loading statistics...</div>
        )}
      </div>

      <div className="border border-[#2c3e50] p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-serif text-lg text-[#2c3e50]">DATA SOURCES</h3>
          <button
            onClick={checkSourceStatus}
            disabled={sourceStatusLoading}
            className="border border-[#2c3e50] px-3 py-1 font-mono text-xs text-[#2c3e50] hover:bg-[#2c3e50] hover:text-white disabled:opacity-50"
          >
            {sourceStatusLoading ? 'Checking...' : 'Run Diagnostics'}
          </button>
        </div>

        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-2">Government Feeds (Automated)</div>

          {sourceStatus ? (
            <div className="grid grid-cols-1 gap-2">
              {sourceStatus.map(entry => {
                const count = stats?.bySource[entry.source] || 0;
                const hasListings = count > 0;
                const statusMap: Record<SourceAccessStatus, { bg: string; textColor: string; badge: string }> = {
                  active: { bg: hasListings ? 'bg-[#f0f5ec]' : 'bg-[#f0f5f8]', textColor: hasListings ? 'text-[#2d5016]' : 'text-[#2c3e50]', badge: hasListings ? 'Active' : 'Ready' },
                  api_key_required: { bg: 'bg-[#fff8e1]', textColor: 'text-[#8b6914]', badge: 'Key Required' },
                  service_offline: { bg: 'bg-[#fdf0f0]', textColor: 'text-[#8b1a1a]', badge: 'Offline' },
                  api_blocked: { bg: 'bg-[#fff8e1]', textColor: 'text-[#8b6914]', badge: 'API Blocked' },
                  no_public_api: { bg: 'bg-[#f0f0f5]', textColor: 'text-[#5a5a7d]', badge: 'No Public API' },
                  js_rendered: { bg: 'bg-[#f5f0e8]', textColor: 'text-[#6b4c2a]', badge: 'JS Rendered' },
                };
                const style = statusMap[entry.accessStatus];
                return (
                  <div key={entry.source} className={`border border-[#2c3e50] px-3 py-3 ${style.bg}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-[#2c3e50]">{entry.name}</span>
                          {hasListings && (
                            <span className="font-mono text-xs text-[#2d5016]">[{count} listings]</span>
                          )}
                        </div>
                        <div className={`font-mono text-xs ${style.textColor} mt-1`}>{entry.reason}</div>
                        {entry.note && (
                          <div className="font-mono text-xs text-[#5a6c7d] mt-1 italic">{entry.note}</div>
                        )}
                        {entry.inventoryHint && (
                          <div className="font-mono text-xs text-[#2c5a6c] mt-1">{entry.inventoryHint}</div>
                        )}
                      </div>
                      <div className={`ml-3 flex-shrink-0 border px-2 py-0.5 font-mono text-xs ${style.textColor} border-current`}>
                        {style.badge}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {GOVERNMENT_SOURCES.map(src => {
                const count = stats?.bySource[src.type] || 0;
                const colors = SOURCE_STATUS_COLORS[count > 0 ? 'active' : 'manual_only'];
                return (
                  <div key={src.type} className={`border border-[#2c3e50] px-3 py-2 ${colors.bg}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-sm text-[#2c3e50]">{src.name}</span>
                        <span className={`ml-2 font-mono text-xs ${colors.text}`}>
                          [{count > 0 ? `${count} listings` : 'Attempted'}]
                        </span>
                      </div>
                      <div className={`border px-2 py-0.5 font-mono text-xs ${colors.text} border-current`}>
                        {count > 0 ? 'Active' : 'Pending'}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-[#5a6c7d] mt-1">{src.description}</div>
                  </div>
                );
              })}
            </div>
          )}

          {!sourceStatus && (
            <div className="font-mono text-xs text-[#5a6c7d] mt-2 italic">
              Run Diagnostics to check live API access status for each source.
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-2">Expansion Sources (GA, TX, NC)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {EXPANSION_SOURCES.map(src => {
              const colors = SOURCE_STATUS_COLORS[src.status];
              return (
                <div key={src.type} className={`border border-[#2c3e50] px-3 py-2 ${colors.bg}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono text-sm text-[#2c3e50]">{src.name}</span>
                      <span className={`ml-2 font-mono text-xs ${colors.text}`}>
                        [{src.states.join(', ')}]
                      </span>
                    </div>
                    <div className={`border px-2 py-0.5 font-mono text-xs ${colors.text} border-current`}>
                      {colors.label}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[#5a6c7d] mt-1">{src.description}</div>
                </div>
              );
            })}
          </div>
          <div className="font-mono text-xs text-[#5a6c7d] mt-3 italic">
            County tax lien auctions and sheriff/foreclosure sales for GA, TX, NC are monitored. Most government auction sites use Cloudflare protection or publish as PDFs, requiring manual data entry. Automated parsing will be enabled as sources become accessible.
          </div>
        </div>
      </div>

      <div className="border border-[#2c3e50] p-3 sm:p-4 mb-6">
        <h3 className="font-serif text-lg text-[#2c3e50] mb-3">FILTERS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">State</label>
            <select
              value={filterState}
              onChange={e => { setFilterState(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Distress Type</label>
            <select
              value={filterDistressType}
              onChange={e => { setFilterDistressType(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]"
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

      <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="font-mono text-sm text-[#5a6c7d]">{total} listings found</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-[#2c3e50] px-4 py-2 min-h-[44px] min-w-[44px] font-mono text-sm disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-mono text-sm py-2 min-h-[44px] flex items-center">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-[#2c3e50] px-4 py-2 min-h-[44px] min-w-[44px] font-mono text-sm disabled:opacity-30"
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
                className="p-3 sm:p-4 cursor-pointer hover:bg-[#f5f0e8] min-h-[44px]"
                onClick={() => setExpanded(expanded === listing.id ? null : listing.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {listing.photos && listing.photos.length > 0 && (
                      <img
                        src={listing.photos[0]}
                        alt={listing.address}
                        className="w-16 h-12 object-cover border border-[#2c3e50] flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-serif text-[#2c3e50] truncate">
                        {listing.address}
                      </div>
                      <div className="font-mono text-sm text-[#5a6c7d]">
                        {listing.city}, {listing.state} {listing.zip}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-lg text-[#2c3e50]">{formatCurrency(listing.listPrice)}</div>
                      {listing.discountPct && Number(listing.discountPct) > 0 && (
                        <div className="font-mono text-xs text-[#2d5016]">
                          {Number(listing.discountPct).toFixed(1)}% below value
                        </div>
                      )}
                    </div>
                    <div className="border border-[#2c3e50] px-2 py-1 min-h-[28px] flex items-center">
                      <span className="font-mono text-xs uppercase">{DISTRESS_LABELS[listing.distressType] || listing.distressType}</span>
                    </div>
                    <div className="border border-[#5a6c7d] px-2 py-1 min-h-[28px] flex items-center">
                      <span className="font-mono text-xs text-[#5a6c7d] uppercase">{SOURCE_LABELS[listing.source] || listing.source}</span>
                    </div>
                  </div>
                </div>
              </div>

              {expanded === listing.id && (
                <div className="border-t border-[#2c3e50] p-3 sm:p-4 bg-[#faf8f4]">
                  {listing.photos && listing.photos.length > 0 && (
                    <div className="mb-4">
                      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x">
                        {listing.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`${listing.address} - Photo ${idx + 1}`}
                            className="w-[280px] sm:w-64 h-[200px] sm:h-44 object-cover border border-[#2c3e50] flex-shrink-0 snap-center"
                          />
                        ))}
                      </div>
                      <div className="font-mono text-xs text-[#5a6c7d] mt-1">{listing.photos.length} photos — swipe to browse</div>
                    </div>
                  )}
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
                  {listing.source === 'attom' && listing.metadata && (
                    <div className="border border-[#2c3e50] bg-[#f5f0e8] p-3 mb-4">
                      <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-2">Pre-Foreclosure Filing Details</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {listing.metadata.filingType && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Filing Type</div>
                            <div className="font-mono text-sm text-[#2c3e50]">{listing.metadata.filingType}</div>
                          </div>
                        )}
                        {listing.metadata.nodDate && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">NOD / Filing Date</div>
                            <div className="font-mono text-sm text-[#2c3e50]">{listing.metadata.nodDate}</div>
                          </div>
                        )}
                        {listing.metadata.lenderName && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Lender</div>
                            <div className="font-mono text-sm text-[#2c3e50]">{listing.metadata.lenderName}</div>
                          </div>
                        )}
                        {listing.metadata.defaultAmount && listing.metadata.defaultAmount > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Default Amount</div>
                            <div className="font-mono text-sm text-[#8b1a1a]">{formatCurrency(listing.metadata.defaultAmount)}</div>
                          </div>
                        )}
                        {listing.metadata.totalDebt && listing.metadata.totalDebt > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Total Debt</div>
                            <div className="font-mono text-sm text-[#2c3e50]">{formatCurrency(listing.metadata.totalDebt)}</div>
                          </div>
                        )}
                        {listing.metadata.auctionOpeningBid && listing.metadata.auctionOpeningBid > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Opening Bid</div>
                            <div className="font-mono text-sm text-[#8b6914]">{formatCurrency(listing.metadata.auctionOpeningBid)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {listing.sourceUrl && (
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-[#2c3e50] px-4 py-3 min-h-[44px] flex items-center justify-center font-mono text-sm hover:bg-[#2c3e50] hover:text-white transition-colors"
                      >
                        View Source
                      </a>
                    )}
                    <button
                      onClick={() => promoteToDeal(listing.id)}
                      disabled={promoting === listing.id}
                      className="border border-[#2d5016] text-[#2d5016] px-4 py-3 min-h-[44px] flex items-center justify-center font-mono text-sm hover:bg-[#2d5016] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {promoting === listing.id ? 'Creating Deal Workspace...' : 'Analyze with Deal Intelligence'}
                    </button>
                  </div>
                  {promoteError && promoting !== listing.id && expanded === listing.id && (
                    <div className="mt-2 font-mono text-xs text-[#8b1a1a] border border-[#8b1a1a] px-3 py-2">
                      {promoteError}
                    </div>
                  )}
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Email *</label>
            <input type="email" required value={form.submitterEmail} onChange={e => updateField('submitterEmail', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Phone</label>
            <input type="tel" value={form.submitterPhone} onChange={e => updateField('submitterPhone', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
        </div>

        <h4 className="font-serif text-[#2c3e50] mb-4">PROPERTY DETAILS</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Address *</label>
            <input type="text" required value={form.propertyAddress} onChange={e => updateField('propertyAddress', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">City *</label>
            <input type="text" required value={form.city} onChange={e => updateField('city', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">State *</label>
              <select required value={form.state} onChange={e => updateField('state', e.target.value)}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]">
                <option value="">--</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">ZIP *</label>
              <input type="text" required value={form.zip} onChange={e => updateField('zip', e.target.value)}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Property Type</label>
            <select value={form.propertyType} onChange={e => updateField('propertyType', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]">
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Bedrooms</label>
            <input type="number" value={form.bedrooms} onChange={e => updateField('bedrooms', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Bathrooms</label>
            <input type="number" step="0.5" value={form.bathrooms} onChange={e => updateField('bathrooms', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Sq Ft</label>
            <input type="number" value={form.sqft} onChange={e => updateField('sqft', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Year Built</label>
            <input type="number" value={form.yearBuilt} onChange={e => updateField('yearBuilt', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
        </div>

        <h4 className="font-serif text-[#2c3e50] mb-4">DEAL NUMBERS</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Asking Price *</label>
            <input type="number" required value={form.askingPrice} onChange={e => updateField('askingPrice', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">ARV (After Repair Value)</label>
            <input type="number" value={form.arv} onChange={e => updateField('arv', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Rehab Estimate</label>
            <input type="number" value={form.rehabEstimate} onChange={e => updateField('rehabEstimate', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Description</label>
            <textarea value={form.description} onChange={e => updateField('description', e.target.value)}
              rows={3} className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Contract End Date</label>
            <input type="date" value={form.contractEndDate} onChange={e => updateField('contractEndDate', e.target.value)}
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="border border-[#2c3e50] bg-[#2c3e50] text-white px-6 py-3 min-h-[44px] font-mono text-sm hover:bg-[#1a2a36] disabled:opacity-50"
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
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
              className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Price</label>
              <input type="number" value={form.minPrice} onChange={e => setForm(p => ({ ...p, minPrice: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Max Price</label>
              <input type="number" value={form.maxPrice} onChange={e => setForm(p => ({ ...p, maxPrice: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Bedrooms</label>
              <input type="number" value={form.minBedrooms} onChange={e => setForm(p => ({ ...p, minBedrooms: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Min Sq Ft</label>
              <input type="number" value={form.minSqft} onChange={e => setForm(p => ({ ...p, minSqft: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Max $/Sq Ft</label>
              <input type="number" value={form.maxPricePerSqft} onChange={e => setForm(p => ({ ...p, maxPricePerSqft: e.target.value }))}
                className="w-full border border-[#2c3e50] bg-white px-3 py-2.5 sm:px-2 sm:py-1.5 font-mono text-sm min-h-[44px]" />
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
            className="border border-[#2c3e50] bg-[#2c3e50] text-white px-6 py-3 min-h-[44px] font-mono text-sm hover:bg-[#1a2a36] disabled:opacity-50">
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
                  className="border border-[#8b1a1a] text-[#8b1a1a] px-3 py-2 min-h-[44px] font-mono text-xs hover:bg-[#8b1a1a] hover:text-white"
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

interface MlsListing {
  mlsNumber: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  listPrice: number;
  daysOnMarket: number | null;
  status: string;
  lastStatus: string;
  lastStatusLabel: string;
  listDate: string | null;
  images: string[];
  description: string | null;
  addressKey: string | null;
  sourceUrl: string | null;
}

function MlsTab() {
  const [listings, setListings] = useState<MlsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinBeds, setFilterMinBeds] = useState('');

  const fetchMls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterCity) params.set('city', filterCity);
      if (filterState) params.set('state', filterState);
      if (filterMinPrice) params.set('min_price', filterMinPrice);
      if (filterMaxPrice) params.set('max_price', filterMaxPrice);
      if (filterMinBeds) params.set('min_beds', filterMinBeds);
      params.set('source', 'mls_repliers');
      const res = await fetch(`/api/distressed-feed/listings?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setListings(data.listings || []);
      setIsTestMode(!!data.isTestMode);
      setConfigured(data.configured !== false);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterCity, filterState, filterMinPrice, filterMaxPrice, filterMinBeds]);

  useEffect(() => { fetchMls(); }, [fetchMls]);

  async function promoteMlsToDeal(listing: MlsListing) {
    const key = listing.mlsNumber || listing.address;
    setPromoting(key);
    setPromoteError(null);
    try {
      const addressStr = [listing.address, listing.city, listing.state, listing.zip].filter(Boolean).join(', ');

      const resolveRes = await fetch('/api/real-estate/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressStr }),
      });
      const resolveData = await resolveRes.json();
      if (!resolveRes.ok || !resolveData.data?.propertyId) {
        throw new Error('Failed to resolve property address');
      }
      const propertyId = resolveData.data.propertyId;

      const createRes = await fetch('/api/real-estate/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, strategy: 'brrrr' }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.data?.id) {
        throw new Error(createData.error || 'Failed to create deal');
      }
      const dealId = createData.data.id;

      await fetch('/api/real-estate/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressStr, dealId }),
      }).catch(() => {});

      window.location.href = `/deal-intelligence/deal/${dealId}`;
    } catch (err: unknown) {
      setPromoteError(err instanceof Error ? err.message : 'Failed to create deal');
      setPromoting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-serif text-lg text-[#2c3e50]">ACTIVE MLS — PRICE REDUCED &amp; RECENTLY EXPIRED</h3>
        {isTestMode && (
          <span className="border border-[#8b6914] px-2 py-0.5 font-mono text-xs text-[#8b6914] uppercase tracking-wide">
            Test Data
          </span>
        )}
      </div>

      <p className="font-mono text-sm text-[#5a6c7d] mb-4">
        Live MLS listings filtered for price reductions (lastStatus: Pc) and recently expired listings
        (lastStatus: Exp) with 60+ days on market. Data via Repliers Realtime MLS API.
        {isTestMode && ' Running on test key — market coverage is limited.'}
      </p>

      {!configured && (
        <div className="border border-[#8b6914] bg-[#fff8e1] p-4 mb-4">
          <div className="font-mono text-sm text-[#8b6914]">
            Repliers API key not configured. Set REPLIERS_API_KEY or REPLIERS_API_TEST_KEY to enable live MLS data.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <input
          type="text"
          placeholder="City"
          value={filterCity}
          onChange={e => { setFilterCity(e.target.value); setPage(1); }}
          className="border border-[#2c3e50] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#8b6914] min-h-[44px]"
        />
        <select
          value={filterState}
          onChange={e => { setFilterState(e.target.value); setPage(1); }}
          className="border border-[#2c3e50] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#8b6914] min-h-[44px]"
        >
          <option value="">All States</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min Price"
          value={filterMinPrice}
          onChange={e => { setFilterMinPrice(e.target.value); setPage(1); }}
          className="border border-[#2c3e50] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#8b6914] min-h-[44px]"
        />
        <input
          type="number"
          placeholder="Max Price"
          value={filterMaxPrice}
          onChange={e => { setFilterMaxPrice(e.target.value); setPage(1); }}
          className="border border-[#2c3e50] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#8b6914] min-h-[44px]"
        />
        <input
          type="number"
          placeholder="Min Beds"
          value={filterMinBeds}
          onChange={e => { setFilterMinBeds(e.target.value); setPage(1); }}
          className="border border-[#2c3e50] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#8b6914] min-h-[44px]"
        />
      </div>

      {promoteError && (
        <div className="border border-[#8b1a1a] bg-[#fdf0f0] p-3 mb-4 font-mono text-sm text-[#8b1a1a]">
          {promoteError}
        </div>
      )}

      {loading ? (
        <div className="font-mono text-sm text-[#5a6c7d] py-8 text-center">Loading MLS listings...</div>
      ) : listings.length === 0 ? (
        <div className="border border-[#2c3e50] p-6 text-center">
          <div className="font-mono text-sm text-[#5a6c7d]">No MLS listings found for these filters.</div>
          <div className="font-mono text-xs text-[#5a6c7d] mt-2">
            {isTestMode ? 'Test key has limited market coverage. Try removing city/state filters.' : 'Try adjusting your filters.'}
          </div>
        </div>
      ) : (
        <>
          <div className="font-mono text-xs text-[#5a6c7d] mb-3">{total} listing{total !== 1 ? 's' : ''} found</div>
          <div className="space-y-0">
            {listings.map((listing) => {
              const key = listing.mlsNumber || listing.address;
              return (
                <div key={key} className="border border-[#2c3e50] border-b-0 last:border-b">
                  <div
                    className="p-3 sm:p-4 cursor-pointer hover:bg-[#f5f0e8] min-h-[44px]"
                    onClick={() => setExpanded(expanded === key ? null : key)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {listing.images && listing.images.length > 0 && (
                          <img
                            src={listing.images[0]}
                            alt={listing.address}
                            className="w-16 h-12 object-cover border border-[#2c3e50] flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-serif text-[#2c3e50] truncate">{listing.address}</div>
                          <div className="font-mono text-sm text-[#5a6c7d]">
                            {listing.city}, {listing.state} {listing.zip}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                        <div className="text-left sm:text-right">
                          <div className="font-mono text-lg text-[#2c3e50]">{formatCurrency(listing.listPrice)}</div>
                          {listing.daysOnMarket && listing.daysOnMarket > 0 && (
                            <div className="font-mono text-xs text-[#5a6c7d]">{listing.daysOnMarket}d on market</div>
                          )}
                        </div>
                        <div className="border border-[#8b6914] px-2 py-1 min-h-[28px] flex items-center">
                          <span className="font-mono text-xs uppercase text-[#8b6914]">{listing.lastStatusLabel || listing.lastStatus}</span>
                        </div>
                        <div className="border border-[#5a6c7d] px-2 py-1 min-h-[28px] flex items-center">
                          <span className="font-mono text-xs text-[#5a6c7d] uppercase">MLS via Repliers</span>
                        </div>
                        {isTestMode && (
                          <div className="border border-[#8b6914] px-2 py-0.5 min-h-[28px] flex items-center">
                            <span className="font-mono text-xs text-[#8b6914] uppercase">Test Data</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expanded === key && (
                    <div className="border-t border-[#2c3e50] p-3 sm:p-4 bg-[#faf8f4]">
                      {listing.images && listing.images.length > 0 && (
                        <div className="mb-4">
                          <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x">
                            {listing.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`${listing.address} - Photo ${idx + 1}`}
                                className="w-[280px] sm:w-64 h-[200px] sm:h-44 object-cover border border-[#2c3e50] flex-shrink-0 snap-center"
                              />
                            ))}
                          </div>
                          <div className="font-mono text-xs text-[#5a6c7d] mt-1">{listing.images.length} photos — swipe to browse</div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Property Type</div>
                          <div className="font-mono text-sm">{listing.propertyType || '--'}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Bedrooms</div>
                          <div className="font-mono text-sm">{listing.bedrooms ?? '--'}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Bathrooms</div>
                          <div className="font-mono text-sm">{listing.bathrooms ?? '--'}</div>
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
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">Days on Market</div>
                          <div className="font-mono text-sm">{listing.daysOnMarket ?? '--'}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d]">MLS #</div>
                          <div className="font-mono text-sm">{listing.mlsNumber || '--'}</div>
                        </div>
                      </div>

                      {listing.description && (
                        <div className="mb-4">
                          <div className="text-xs uppercase tracking-wider text-[#5a6c7d] mb-1">Description</div>
                          <div className="font-mono text-sm text-[#2c3e50]">{listing.description}</div>
                        </div>
                      )}

                      {isTestMode && (
                        <div className="border border-[#8b6914] bg-[#fff8e1] p-2 mb-4">
                          <div className="font-mono text-xs text-[#8b6914]">
                            Test Data — Limited market coverage. Add REPLIERS_API_KEY for full MLS access.
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => promoteMlsToDeal(listing)}
                          disabled={!!promoting}
                          className="border border-[#2c3e50] px-4 py-2 font-mono text-xs text-[#2c3e50] hover:bg-[#2c3e50] hover:text-white disabled:opacity-50 min-h-[44px]"
                        >
                          {promoting === (listing.mlsNumber || listing.address) ? 'Creating Deal...' : 'Promote to Deal'}
                        </button>
                        {listing.sourceUrl && (
                          <a
                            href={listing.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-[#5a6c7d] px-4 py-2 font-mono text-xs text-[#5a6c7d] hover:bg-[#5a6c7d] hover:text-white min-h-[44px] flex items-center"
                          >
                            View MLS Listing
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border border-[#2c3e50] px-3 py-2 font-mono text-sm disabled:opacity-40 hover:bg-[#2c3e50] hover:text-white min-h-[44px]"
              >
                Prev
              </button>
              <span className="border border-[#2c3e50] px-4 py-2 font-mono text-sm min-h-[44px] flex items-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border border-[#2c3e50] px-3 py-2 font-mono text-sm disabled:opacity-40 hover:bg-[#2c3e50] hover:text-white min-h-[44px]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DistressedFeedPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Property Feed' },
    { id: 'mls', label: 'Active MLS' },
    { id: 'submit', label: 'Submit Deal' },
    { id: 'buybox', label: 'My Buy Box' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Deal Flow | AXIOM</title>
      </Head>
      <div className="w-full mb-6 overflow-hidden border border-dl-border">
        <div className="relative w-full" style={{ height: '320px' }}>
          <Image
            src="/images/realestate/distressed_feed_hero.png"
            alt="Distressed Property Feed — Deal Flow"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Real Asset Deployment Layer — Deal Flow</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Distressed Property Feed</h1>
        <p className="text-dl-gray text-sm mb-6">
          Aggregated distressed property feed sourcing acquisition targets from government REO programs,
          pre-foreclosure filings, county courthouse records, and tax sales. Listings promoted from this
          feed enter the Deal Intelligence underwriting workspace directly.
        </p>
      </div>

      <div className="border border-dl-border mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Government REO</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              HUD HomeStore, Fannie Mae HomePath, Freddie Mac HomeSteps, and USDA rural properties.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Pre-Foreclosure</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              ATTOM pre-foreclosure filings: NOD, Lis Pendens, and Notice of Trustee Sale with 90-day lookback.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Tax Sales</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              County tax lien and deed sales, sheriff sales, and courthouse public records across 10 target states.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Buy Box Match</p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Set acquisition criteria — state, price range, property type — and promote matched listings to Deal Intelligence.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20 sm:pb-8">

        <div className="flex overflow-x-auto border-b border-[#2c3e50] mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 sm:px-6 py-3 min-h-[44px] font-mono text-sm border-b-2 -mb-px whitespace-nowrap ${
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
        {activeTab === 'mls' && <MlsTab />}
        {activeTab === 'submit' && <SubmitTab />}
        {activeTab === 'buybox' && <BuyBoxTab />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#2c3e50] p-3 sm:hidden z-40">
        <a
          href="/deal-intelligence"
          className="block w-full bg-[#2c3e50] text-white text-center py-3 min-h-[44px] font-mono text-sm font-bold"
        >
          Analyze This Deal
        </a>
      </div>
    </DesignLawLayout>
  );
}

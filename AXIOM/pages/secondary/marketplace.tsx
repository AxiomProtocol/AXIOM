import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface Listing {
  id: string;
  series_id: string;
  series_name: string;
  series_slug: string;
  asset_class: string;
  seller_id: string;
  seller_name: string;
  seller_category: string;
  status: string;
  units_offered: string;
  units_remaining: string;
  price_type: string;
  ask_price_per_unit: string | null;
  minimum_bid_units: string;
  settlement_asset: string;
  latest_nav: string | null;
  active_bid_count: string;
  created_at: string;
  expires_at: string | null;
}

interface Series {
  id: string;
  name: string;
  slug: string;
  asset_class: string;
  status: string;
  current_nav: string | null;
  unit_price: string | null;
  liquidity_score: string | null;
  score_label: string | null;
  holder_count: string;
  active_listing_count: string;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  fund_interest: 'Fund Interest',
  private_credit: 'Private Credit',
  mortgage_note: 'Mortgage Note',
  dscr_loan: 'DSCR Loan',
  fix_flip_debt: 'Fix & Flip Debt',
  rent_stream: 'Rent Stream',
  land_interest: 'Land Interest',
  treasury_yield: 'Treasury Yield',
};

const LIQUIDITY_COLORS: Record<string, string> = {
  High: 'text-dl-forest',
  Medium: 'text-amber-600',
  Low: 'text-dl-error',
};

function fmtUnits(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MarketplacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'listings' | 'series'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [bid, setBid] = useState({ units: '', price: '' });
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidResult, setBidResult] = useState('');
  const [filterAssetClass, setFilterAssetClass] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [listRes, serRes] = await Promise.all([
        fetch('/api/secondary/marketplace/listings'),
        fetch('/api/secondary/series'),
      ]);

      if (listRes.ok) {
        const d = await listRes.json();
        if (d.success) setListings(d.listings || []);
      }
      if (serRes.ok) {
        const d = await serRes.json();
        if (d.success) setSeries(d.series || []);
      }
    } catch {
      setError('Failed to load marketplace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredListings = filterAssetClass
    ? listings.filter(l => l.asset_class === filterAssetClass)
    : listings;

  async function handleBid(listingId: string) {
    if (!bid.units || !bid.price) return;
    setBidSubmitting(true);
    setBidResult('');
    try {
      const res = await fetch(`/api/secondary/marketplace/listings/${listingId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitsRequested: parseFloat(bid.units),
          bidPricePerUnit: parseFloat(bid.price),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBidResult(`Bid submitted — ID: ${data.bidId}`);
        setBid({ units: '', price: '' });
        setSelectedListing(null);
        await loadData();
      } else {
        setBidResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setBidResult(`Error: ${err.message}`);
    } finally {
      setBidSubmitting(false);
    }
  }

  async function handleInterest(listingId: string) {
    try {
      await fetch(`/api/secondary/marketplace/listings/${listingId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Interested in this listing' }),
      });
      setBidResult('Interest registered. The seller has been notified.');
    } catch {
      setBidResult('Error registering interest.');
    }
  }

  return (
    <DesignLawLayout>
      <Head><title>Secondary Marketplace | Axiom Protocol</title></Head>

      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">Secondary Marketplace</h1>
            <p className="text-sm text-dl-muted mt-1">Permissioned peer-to-peer transfers of Axiom-issued private market positions</p>
          </div>
          <Link href="/secondary">
            <button className="text-xs font-mono text-dl-muted hover:text-dl-navy">← Portfolio</button>
          </Link>
        </div>

        <div className="flex gap-6 mt-6">
          <button
            onClick={() => setTab('listings')}
            className={`font-mono text-sm pb-2 border-b-2 ${tab === 'listings' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-muted hover:text-dl-navy'}`}
          >
            Active Listings
          </button>
          <button
            onClick={() => setTab('series')}
            className={`font-mono text-sm pb-2 border-b-2 ${tab === 'series' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-muted hover:text-dl-navy'}`}
          >
            All Series
          </button>
        </div>
      </div>

      {loading && <div className="font-mono text-sm text-dl-muted">Loading marketplace...</div>}
      {error && <div className="font-mono text-sm text-dl-error">{error}</div>}

      {!loading && tab === 'listings' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <select
              value={filterAssetClass}
              onChange={e => setFilterAssetClass(e.target.value)}
              className="border border-gray-300 p-2 text-sm font-mono"
            >
              <option value="">All Asset Classes</option>
              {Object.entries(ASSET_CLASS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {filteredListings.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="font-mono text-sm text-dl-muted">No active listings available.</p>
              <p className="font-mono text-xs text-dl-muted mt-1">Sellers may post units from their portfolio for transfer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => {
                const navRef = listing.latest_nav ? parseFloat(listing.latest_nav) : null;
                const askPrice = listing.ask_price_per_unit ? parseFloat(listing.ask_price_per_unit) : null;
                const premiumDiscount = (navRef && askPrice) ? (askPrice - navRef) / navRef : null;
                const isSelected = selectedListing?.id === listing.id;

                return (
                  <div key={listing.id} className="border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-serif text-base text-dl-navy">{listing.series_name}</h3>
                        <div className="flex gap-3 mt-1">
                          <span className="font-mono text-xs text-dl-muted">{ASSET_CLASS_LABELS[listing.asset_class] || listing.asset_class}</span>
                          <span className="font-mono text-xs text-dl-muted">·</span>
                          <span className="font-mono text-xs text-dl-muted">{listing.price_type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-xs text-dl-muted">·</span>
                          <span className="font-mono text-xs text-dl-muted">Expires {fmtDate(listing.expires_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {askPrice ? (
                          <div>
                            <div className="font-mono text-lg text-dl-navy">{fmtCurrency(askPrice)}<span className="text-xs text-dl-muted"> / unit</span></div>
                            {premiumDiscount !== null && (
                              <div className={`font-mono text-xs ${premiumDiscount >= 0 ? 'text-amber-600' : 'text-dl-forest'}`}>
                                {premiumDiscount >= 0 ? '+' : ''}{(premiumDiscount * 100).toFixed(2)}% to NAV
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-mono text-sm text-dl-muted">Price: Negotiable</div>
                        )}
                        {navRef && <div className="font-mono text-xs text-dl-muted">NAV: {fmtCurrency(navRef)}</div>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Units Available</div>
                        <div className="font-mono text-sm text-dl-navy">{fmtUnits(listing.units_remaining)} <span className="text-dl-muted">/ {fmtUnits(listing.units_offered)}</span></div>
                      </div>
                      <div>
                        <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Min Bid Units</div>
                        <div className="font-mono text-sm text-dl-navy">{fmtUnits(listing.minimum_bid_units)}</div>
                      </div>
                      <div>
                        <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Settlement</div>
                        <div className="font-mono text-sm text-dl-navy">{listing.settlement_asset?.toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedListing(isSelected ? null : listing); setBidResult(''); setBid({ units: '', price: '' }); }}
                        className="px-4 py-2 bg-dl-navy text-white text-xs font-mono"
                      >
                        {isSelected ? 'Close' : 'Submit Bid'}
                      </button>
                      <button
                        onClick={() => handleInterest(listing.id)}
                        className="px-4 py-2 border border-gray-300 text-dl-muted text-xs font-mono hover:border-dl-navy hover:text-dl-navy"
                      >
                        Express Interest
                      </button>
                      <span className="font-mono text-xs text-dl-muted">{listing.active_bid_count} active bid{listing.active_bid_count !== '1' ? 's' : ''}</span>
                    </div>

                    {isSelected && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h4 className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-3">Place Bid</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="font-mono text-xs text-dl-muted block mb-1">Units to Purchase</label>
                            <input
                              type="number" step="0.01"
                              value={bid.units}
                              onChange={e => setBid(v => ({ ...v, units: e.target.value }))}
                              className="w-full border border-gray-300 p-2 text-sm font-mono"
                              placeholder={`Min: ${parseFloat(listing.minimum_bid_units).toFixed(2)}`}
                            />
                          </div>
                          <div>
                            <label className="font-mono text-xs text-dl-muted block mb-1">Bid Price / Unit (AXUSD)</label>
                            <input
                              type="number" step="0.01"
                              value={bid.price}
                              onChange={e => setBid(v => ({ ...v, price: e.target.value }))}
                              className="w-full border border-gray-300 p-2 text-sm font-mono"
                              placeholder={askPrice ? `Ask: ${askPrice.toFixed(2)}` : 'Your offer'}
                            />
                          </div>
                        </div>
                        {bid.units && bid.price && (
                          <div className="font-mono text-xs text-dl-muted mb-3">
                            Total: {fmtCurrency(parseFloat(bid.units) * parseFloat(bid.price))} AXUSD · Platform fee: {fmtCurrency(parseFloat(bid.units) * parseFloat(bid.price) * 0.005)} (0.5%)
                          </div>
                        )}
                        <button
                          onClick={() => handleBid(listing.id)}
                          disabled={bidSubmitting || !bid.units || !bid.price}
                          className="px-5 py-2 bg-dl-forest text-white text-sm font-mono disabled:opacity-50"
                        >
                          {bidSubmitting ? 'Submitting...' : 'Submit Bid'}
                        </button>
                        {bidResult && (
                          <p className={`mt-2 font-mono text-sm ${bidResult.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>{bidResult}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-4">
            <p className="font-mono text-xs text-dl-muted">
              All bids are subject to seller acceptance, compliance verification, and issuer approval where required. Settled via AXUSD on Arbitrum One. Platform fee: 0.5% of gross proceeds, charged at settlement. Listings do not constitute an offer to sell securities.
            </p>
          </div>
        </>
      )}

      {!loading && tab === 'series' && (
        <div className="border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Series</th>
                <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Asset Class</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">NAV / Unit</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Holders</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Active Listings</th>
                <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Liquidity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {series.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-sm text-dl-muted">No active series found.</td></tr>
              ) : series.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-dl-navy font-medium">{s.name}</div>
                    <div className="font-mono text-xs text-dl-muted">{s.status?.toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-dl-muted">{ASSET_CLASS_LABELS[s.asset_class] || s.asset_class}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtCurrency(s.current_nav || s.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{s.holder_count}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{s.active_listing_count}</td>
                  <td className="px-4 py-3">
                    {s.score_label ? (
                      <span className={`font-mono text-xs ${LIQUIDITY_COLORS[s.score_label] || 'text-dl-muted'}`}>
                        {s.score_label} ({parseFloat(s.liquidity_score || '0').toFixed(0)})
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-dl-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DesignLawLayout>
  );
}

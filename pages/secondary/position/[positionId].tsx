import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

interface Position {
  id: string;
  series_id: string;
  series_name: string;
  slug: string;
  asset_class: string;
  status: string;
  total_units: string;
  available_units: string;
  locked_units: string;
  cost_basis: string | null;
  current_nav: string | null;
  unit_price: string | null;
  transferability_status: string;
  distribution_frequency: string;
  hold_period_days: number;
  reconciliation_status: string;
  wallet_address: string | null;
}

interface Lot {
  id: string;
  source_type: string;
  units: string;
  price_per_unit: string | null;
  acquired_at: string;
  hold_releases_at: string | null;
  is_locked: boolean;
}

interface Pricing {
  referenceNav: string | null;
  navStatus: string | null;
  navMethod: string | null;
  navDate: string | null;
  isStaleNav: boolean;
  lastTradePrice: string | null;
  lastTradedAt: string | null;
  lastTradePremiumDiscount: string | null;
  rolling30d: {
    avgPrice: string | null;
    totalVolumeUnits: string | null;
    totalVolumeValue: string | null;
    tradeCount: number;
    avgPremiumDiscount: string | null;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  primary_subscription: 'Primary Subscription',
  secondary_purchase: 'Secondary Purchase',
  distribution_reinvestment: 'Distribution Reinvestment',
  transfer_in: 'Transfer In',
};

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

function fmtUnits(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtCurrency(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtPct(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(2)}%`;
}

export default function PositionDetail() {
  const router = useRouter();
  const { positionId } = router.query as { positionId: string };
  const [position, setPosition] = useState<Position | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showListForm, setShowListForm] = useState(false);
  const [listing, setListing] = useState({ priceType: 'negotiable', askPricePerUnit: '', units: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [listResult, setListResult] = useState('');

  useEffect(() => {
    if (!positionId) return;
    async function load() {
      try {
        const res = await fetch(`/api/secondary/positions/${positionId}`);
        if (!res.ok) throw new Error('Failed to load position');
        const data = await res.json();
        if (data.success) {
          setPosition(data.position);
          setLots(data.lots || []);
          setPricing(data.pricing);
          setTotalValue(data.totalValue || 0);
        } else {
          setError(data.error || 'Position not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [positionId]);

  async function handleCreateListing() {
    if (!position) return;
    setSubmitting(true);
    setListResult('');
    try {
      const res = await fetch('/api/secondary/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId: position.series_id,
          unitsOffered: parseFloat(listing.units),
          priceType: listing.priceType,
          askPricePerUnit: listing.askPricePerUnit ? parseFloat(listing.askPricePerUnit) : undefined,
          description: listing.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setListResult(`Listing created — ID: ${data.listingId}. Compliance: ${data.complianceDecision}.`);
        setShowListForm(false);
      } else {
        setListResult(`Error: ${data.error || data.reason || 'Unknown error'}`);
      }
    } catch (err: any) {
      setListResult(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="font-mono text-sm text-dl-muted">Loading position...</div>
      </DesignLawLayout>
    );
  }

  if (error || !position) {
    return (
      <DesignLawLayout>
        <div className="border border-dl-error bg-red-50 p-6">
          <p className="font-mono text-sm text-dl-error">{error || 'Position not found'}</p>
          <Link href="/secondary"><button className="mt-4 text-xs font-mono text-dl-navy">← Back to portfolio</button></Link>
        </div>
      </DesignLawLayout>
    );
  }

  const canTransfer = position.transferability_status !== 'not_transferable' && parseFloat(position.available_units) > 0;
  const costBasisPerUnit = position.cost_basis && parseFloat(position.total_units) > 0
    ? parseFloat(position.cost_basis) / parseFloat(position.total_units)
    : null;

  return (
    <DesignLawLayout>
      <Head><title>{position.series_name} — Position | Axiom Secondary Network</title></Head>

      <div className="mb-6">
        <Link href="/secondary"><span className="font-mono text-xs text-dl-muted hover:text-dl-navy">← Portfolio</span></Link>
      </div>

      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">{position.series_name}</h1>
            <p className="font-mono text-xs text-dl-muted mt-1">{ASSET_CLASS_LABELS[position.asset_class] || position.asset_class} · {position.transferability_status.replace(/_/g, ' ').toUpperCase()}</p>
          </div>
          {canTransfer && (
            <button
              onClick={() => setShowListForm(v => !v)}
              className="px-4 py-2 bg-dl-forest text-white text-sm font-mono"
            >
              {showListForm ? 'Cancel' : 'Create Listing'}
            </button>
          )}
        </div>
      </div>

      {/* Create listing form */}
      {showListForm && (
        <div className="border border-dl-forest p-6 mb-8 bg-green-50">
          <h3 className="font-serif text-base text-dl-navy mb-4">List Units for Transfer</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Units to Offer</label>
              <input
                type="number" step="0.01" max={position.available_units}
                value={listing.units}
                onChange={e => setListing(v => ({ ...v, units: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono"
                placeholder={`Max: ${parseFloat(position.available_units).toFixed(4)}`}
              />
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Price Type</label>
              <select
                value={listing.priceType}
                onChange={e => setListing(v => ({ ...v, priceType: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono"
              >
                <option value="negotiable">Negotiable</option>
                <option value="fixed">Fixed</option>
                <option value="minimum_ask">Minimum Ask</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Ask Price / Unit (AXUSD)</label>
              <input
                type="number" step="0.01"
                value={listing.askPricePerUnit}
                onChange={e => setListing(v => ({ ...v, askPricePerUnit: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono"
                placeholder={pricing?.referenceNav ? `NAV: ${parseFloat(pricing.referenceNav).toFixed(2)}` : 'Optional'}
              />
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Description (optional)</label>
              <input
                type="text"
                value={listing.description}
                onChange={e => setListing(v => ({ ...v, description: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono"
                placeholder="Brief note for buyers"
              />
            </div>
          </div>
          <button
            onClick={handleCreateListing}
            disabled={submitting || !listing.units || parseFloat(listing.units) <= 0}
            className="px-6 py-2 bg-dl-navy text-white text-sm font-mono disabled:opacity-50"
          >
            {submitting ? 'Running compliance checks...' : 'Submit Listing'}
          </button>
          {listResult && (
            <p className={`mt-3 font-mono text-sm ${listResult.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>{listResult}</p>
          )}
          <p className="font-mono text-xs text-dl-muted mt-3">Listing triggers compliance checks: available units, KYC/AML status, hold period, NAV discount review, and registry reconciliation. Blocked listings cannot be listed until the check is resolved.</p>
        </div>
      )}

      {/* Position summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-200 p-4">
          <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Total Units</div>
          <div className="font-mono text-xl text-dl-navy">{fmtUnits(position.total_units)}</div>
        </div>
        <div className="border border-gray-200 p-4">
          <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Available</div>
          <div className={`font-mono text-xl ${parseFloat(position.available_units) > 0 ? 'text-dl-forest' : 'text-dl-muted'}`}>
            {fmtUnits(position.available_units)}
          </div>
          {parseFloat(position.locked_units) > 0 && (
            <div className="font-mono text-xs text-amber-600">{fmtUnits(position.locked_units)} locked</div>
          )}
        </div>
        <div className="border border-gray-200 p-4">
          <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Position Value</div>
          <div className="font-mono text-xl text-dl-navy">{fmtCurrency(totalValue)}</div>
        </div>
        <div className="border border-gray-200 p-4">
          <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Cost Basis / Unit</div>
          <div className="font-mono text-xl text-dl-navy">{fmtCurrency(costBasisPerUnit)}</div>
        </div>
      </div>

      {/* Pricing intelligence */}
      {pricing && (
        <div className="mb-8">
          <h2 className="font-serif text-lg text-dl-navy mb-4">Pricing Intelligence</h2>
          <div className="border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
              <div className="p-4">
                <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Reference NAV</div>
                <div className="font-mono text-lg text-dl-navy">{fmtCurrency(pricing.referenceNav)}</div>
                <div className="font-mono text-xs text-dl-muted">{pricing.navMethod?.replace(/_/g, ' ')} · {fmtDate(pricing.navDate)}</div>
                {pricing.isStaleNav && <div className="font-mono text-xs text-amber-600 mt-1">NAV may be stale</div>}
              </div>
              <div className="p-4">
                <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Last Trade</div>
                <div className="font-mono text-lg text-dl-navy">{fmtCurrency(pricing.lastTradePrice)}</div>
                {pricing.lastTradePremiumDiscount && (
                  <div className={`font-mono text-xs ${parseFloat(pricing.lastTradePremiumDiscount) >= 0 ? 'text-dl-forest' : 'text-dl-error'}`}>
                    {fmtPct(pricing.lastTradePremiumDiscount)} to NAV
                  </div>
                )}
                <div className="font-mono text-xs text-dl-muted">{fmtDate(pricing.lastTradedAt)}</div>
              </div>
              <div className="p-4">
                <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">30D Avg Price</div>
                <div className="font-mono text-lg text-dl-navy">{fmtCurrency(pricing.rolling30d.avgPrice)}</div>
                <div className="font-mono text-xs text-dl-muted">{pricing.rolling30d.tradeCount} trade{pricing.rolling30d.tradeCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="p-4">
                <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">30D Volume</div>
                <div className="font-mono text-lg text-dl-navy">{fmtCurrency(pricing.rolling30d.totalVolumeValue)}</div>
                <div className="font-mono text-xs text-dl-muted">{fmtUnits(pricing.rolling30d.totalVolumeUnits)} units</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lot detail */}
      <div className="mb-8">
        <h2 className="font-serif text-lg text-dl-navy mb-4">Acquisition Lots</h2>
        {lots.length === 0 ? (
          <div className="border border-gray-200 p-6 text-center">
            <p className="font-mono text-sm text-dl-muted">No lot records found.</p>
          </div>
        ) : (
          <div className="border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Source</th>
                  <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Units</th>
                  <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Price / Unit</th>
                  <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Acquired</th>
                  <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Hold Expires</th>
                  <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lots.map((lot) => {
                  const holdPast = lot.hold_releases_at && new Date(lot.hold_releases_at) < new Date();
                  return (
                    <tr key={lot.id}>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{SOURCE_LABELS[lot.source_type] || lot.source_type}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtUnits(lot.units)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtCurrency(lot.price_per_unit)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{fmtDate(lot.acquired_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {lot.hold_releases_at ? (
                          <span className={holdPast ? 'text-dl-forest' : 'text-amber-600'}>
                            {fmtDate(lot.hold_releases_at)} {holdPast ? '(cleared)' : '(active)'}
                          </span>
                        ) : <span className="text-dl-muted">None</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={lot.is_locked ? 'text-amber-600' : 'text-dl-muted'}>{lot.is_locked ? 'Locked' : 'Free'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation status */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-dl-muted">Registry:</span>
          <span className={`font-mono text-xs ${position.reconciliation_status === 'reconciled' ? 'text-dl-forest' : 'text-dl-error'}`}>
            {position.reconciliation_status?.toUpperCase()}
          </span>
        </div>
        <p className="font-mono text-xs text-dl-muted mt-2">
          Position data reflects the on-platform registry. Transfers are subject to compliance verification and issuer approval. Settlement on Arbitrum One via AXUSD (ERC-3643).
        </p>
      </div>
    </DesignLawLayout>
  );
}

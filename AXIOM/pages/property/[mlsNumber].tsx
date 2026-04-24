import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface ListingDetail {
  mlsNumber: string;
  address: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  neighborhood: string | null;
  area: string | null;
  majorIntersection: string | null;
  country: string | null;
  propertyType: string;
  propertyStyle: string | null;
  propertyClass: string | null;
  propertyTypeRaw: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  bathroomsPlus: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  garage: string | null;
  lotWidth: string | null;
  lotDepth: string | null;
  lotArea: string | null;
  listPrice: number;
  soldPrice: number | null;
  daysOnMarket: number | null;
  status: string;
  lastStatus: string;
  lastStatusLabel: string;
  listDate: string | null;
  soldDate: string | null;
  latitude: number | null;
  longitude: number | null;
  streetViewUrl: string | null;
  description: string | null;
  images: string[];
}

interface CmaComp {
  mlsNumber: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  listPrice: number | null;
  soldPrice: number | null;
  pricePerSqft: number | null;
  soldDate: string | null;
  daysOnMarket: number | null;
  distanceScore: number;
  imageUrl: string | null;
  sourceUrl: string | null;
}

interface CmaResponse {
  configured: boolean;
  isTestMode: boolean;
  subject: any;
  avm: { price: number | null; priceMin: number | null; priceMax: number | null; confidence: string | null };
  stats: {
    soldCount: number;
    activeCount: number;
    soldMedianPrice: number | null;
    soldMedianPpsf: number | null;
    activeMedianPrice: number | null;
    activeMedianPpsf: number | null;
    arvBlend: number | null;
    vsAvm: number | null;
    vsArv: number | null;
    vsMedianSold: number | null;
  };
  comps: { sold: CmaComp[]; active: CmaComp[] };
}

function formatCurrency(n: number | null | undefined): string {
  if (!n && n !== 0) return '--';
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(s: string | null): string {
  if (!s) return '--';
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

function formatDelta(n: number | null): { text: string; color: string } {
  if (n === null || n === undefined) return { text: '--', color: '#5a6c7d' };
  const sign = n >= 0 ? '+' : '';
  const color = n < 0 ? '#1e6f3a' : n > 0 ? '#a02828' : '#5a6c7d';
  return { text: `${sign}${formatCurrency(n)}`, color };
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const { mlsNumber } = router.query;
  const mls = typeof mlsNumber === 'string' ? mlsNumber : '';

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cma, setCma] = useState<CmaResponse | null>(null);
  const [cmaLoading, setCmaLoading] = useState(false);
  const [cmaError, setCmaError] = useState<string | null>(null);

  const [activePhoto, setActivePhoto] = useState(0);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<string | null>(null);

  useEffect(() => {
    if (!mls) return;
    setLoading(true);
    setError(null);
    fetch(`/api/distressed-feed/listing/${encodeURIComponent(mls)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Failed to load listing');
        return j;
      })
      .then((j) => {
        setListing(j.listing);
        setIsTestMode(!!j.isTestMode);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mls]);

  useEffect(() => {
    if (!mls || !listing) return;
    setCmaLoading(true);
    setCmaError(null);
    fetch(`/api/distressed-feed/cma?mlsNumber=${encodeURIComponent(mls)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'CMA failed');
        return j;
      })
      .then((j) => setCma(j))
      .catch((e) => setCmaError(e.message))
      .finally(() => setCmaLoading(false));
  }, [mls, listing]);

  async function promote() {
    if (!listing) return;
    setPromoting(true);
    setPromoteResult(null);
    try {
      const r = await fetch('/api/distressed-feed/mls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote', mlsNumber: listing.mlsNumber }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Promote failed');
      setPromoteResult('Deal created successfully');
    } catch (e: any) {
      setPromoteResult(`Error: ${e.message}`);
    } finally {
      setPromoting(false);
    }
  }

  const fullLocation = useMemo(() => {
    if (!listing) return '';
    return [listing.city, listing.state].filter(Boolean).join(', ') + (listing.zip ? ` ${listing.zip}` : '');
  }, [listing]);

  const mapsUrl = useMemo(() => {
    if (!listing) return null;
    if (listing.latitude && listing.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;
    }
    const q = `${listing.address} ${fullLocation}`.trim();
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
  }, [listing, fullLocation]);

  return (
    <DesignLawLayout>
      <div className="mb-4">
        <Link href="/distressed-feed" className="font-mono text-xs text-[#5a6c7d] hover:text-[#2c3e50]">
          &larr; Back to Property Listings
        </Link>
      </div>

      {loading && (
        <div className="font-mono text-sm text-[#5a6c7d]">Loading listing detail...</div>
      )}

      {error && !loading && (
        <div className="border border-[#a02828] bg-[#fff5f5] p-4 font-mono text-sm text-[#a02828]">
          {error}
        </div>
      )}

      {!loading && !error && listing && (
        <>
          {isTestMode && (
            <div className="border border-[#8b6914] bg-[#fff8e1] p-2 mb-4">
              <div className="font-mono text-xs text-[#8b6914]">
                Test Data — Limited market coverage. Production REPLIERS_API_KEY required for full MLS coverage.
              </div>
            </div>
          )}

          <div className="border-b border-[#2c3e50] pb-4 mb-6">
            <div className="font-mono text-xs text-[#5a6c7d] uppercase tracking-wider mb-1">
              MLS #{listing.mlsNumber}
              {listing.lastStatusLabel && <span className="ml-3 text-[#8b6914]">{listing.lastStatusLabel}</span>}
            </div>
            <h1 className="font-serif text-3xl text-[#2c3e50] mb-1">{listing.address}{listing.unit ? ` #${listing.unit}` : ''}</h1>
            <div className="font-mono text-base text-[#5a6c7d] mb-3">{fullLocation}</div>
            <div className="flex flex-wrap items-baseline gap-6">
              <div>
                <div className="font-mono text-xs text-[#5a6c7d] uppercase">List Price</div>
                <div className="font-serif text-3xl text-[#2c3e50]">{formatCurrency(listing.listPrice)}</div>
              </div>
              {listing.sqft && listing.listPrice > 0 && (
                <div>
                  <div className="font-mono text-xs text-[#5a6c7d] uppercase">$/SqFt</div>
                  <div className="font-mono text-lg text-[#2c3e50]">${Math.round(listing.listPrice / listing.sqft)}</div>
                </div>
              )}
              {listing.daysOnMarket !== null && (
                <div>
                  <div className="font-mono text-xs text-[#5a6c7d] uppercase">Days on Market</div>
                  <div className="font-mono text-lg text-[#2c3e50]">{listing.daysOnMarket}</div>
                </div>
              )}
              {listing.listDate && (
                <div>
                  <div className="font-mono text-xs text-[#5a6c7d] uppercase">Listed</div>
                  <div className="font-mono text-lg text-[#2c3e50]">{formatDate(listing.listDate)}</div>
                </div>
              )}
            </div>
          </div>

          {listing.images && listing.images.length > 0 && (
            <div className="mb-6">
              <img
                src={listing.images[activePhoto]}
                alt={`${listing.address} — Photo ${activePhoto + 1} of ${listing.images.length}`}
                className="w-full max-h-[600px] object-cover border border-[#2c3e50]"
              />
              {listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mt-2 snap-x snap-mandatory touch-pan-x">
                  {listing.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhoto(idx)}
                      className={`flex-shrink-0 snap-center border ${
                        idx === activePhoto ? 'border-[#8b6914] border-2' : 'border-[#2c3e50]'
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-24 h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="font-mono text-xs text-[#5a6c7d] mt-1">
                Photo {activePhoto + 1} of {listing.images.length}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 border border-[#2c3e50] p-4">
            <Stat label="Property Type" value={listing.propertyType} />
            <Stat label="Bedrooms" value={listing.bedrooms?.toString() || '--'} />
            <Stat label="Bathrooms" value={listing.bathrooms?.toString() || '--'} />
            <Stat label="Sq Ft" value={listing.sqft?.toLocaleString() || '--'} />
            <Stat label="Year Built" value={listing.yearBuilt?.toString() || '--'} />
            <Stat label="Garage" value={listing.garage || '--'} />
            <Stat label="Lot (W x D)" value={listing.lotWidth && listing.lotDepth ? `${listing.lotWidth} x ${listing.lotDepth}` : '--'} />
            <Stat label="Lot Area" value={listing.lotArea || '--'} />
            <Stat label="Property Style" value={listing.propertyStyle || '--'} />
            <Stat label="Property Class" value={listing.propertyClass || '--'} />
            <Stat label="Status" value={listing.lastStatusLabel || listing.status || '--'} />
            <Stat label="Neighborhood" value={listing.neighborhood || listing.area || '--'} />
          </div>

          {listing.description && (
            <div className="mb-6">
              <h2 className="font-serif text-xl text-[#2c3e50] mb-2">Description</h2>
              <div className="font-mono text-sm text-[#2c3e50] leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </div>
            </div>
          )}

          {(listing.latitude || mapsUrl) && (
            <div className="mb-6">
              <h2 className="font-serif text-xl text-[#2c3e50] mb-2">Location</h2>
              {listing.latitude && listing.longitude && (
                <div className="font-mono text-xs text-[#5a6c7d] mb-2">
                  {listing.latitude.toFixed(6)}, {listing.longitude.toFixed(6)}
                </div>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block border border-[#5a6c7d] px-4 py-2 font-mono text-xs text-[#5a6c7d] hover:bg-[#5a6c7d] hover:text-white"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          )}

          <div className="border border-[#2c3e50] p-4 mb-6">
            <h2 className="font-serif text-xl text-[#2c3e50] mb-3">Investor Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={promote}
                disabled={promoting}
                className="border border-[#2c3e50] bg-[#2c3e50] text-white px-4 py-2 font-mono text-xs hover:bg-[#1e3a5f] disabled:opacity-50 min-h-[44px]"
              >
                {promoting ? 'Creating Deal...' : 'Promote to Deal'}
              </button>
              <Link
                href={`/property-analysis?address=${encodeURIComponent(listing.address)}&city=${encodeURIComponent(listing.city)}&state=${encodeURIComponent(listing.state)}&zip=${encodeURIComponent(listing.zip)}`}
                className="border border-[#8b6914] px-4 py-2 font-mono text-xs text-[#8b6914] hover:bg-[#8b6914] hover:text-white min-h-[44px] flex items-center"
              >
                Run Property Analysis
              </Link>
            </div>
            {promoteResult && (
              <div className={`mt-3 font-mono text-xs ${promoteResult.startsWith('Error') ? 'text-[#a02828]' : 'text-[#1e6f3a]'}`}>
                {promoteResult}
              </div>
            )}
          </div>

          <div className="border border-[#2c3e50] p-4 mb-6">
            <h2 className="font-serif text-xl text-[#2c3e50] mb-3">Comparative Market Analysis</h2>
            {cmaLoading && <div className="font-mono text-sm text-[#5a6c7d]">Running CMA — fetching sold and active comps...</div>}
            {cmaError && <div className="font-mono text-sm text-[#a02828]">{cmaError}</div>}
            {cma && <CmaPanel cma={cma} />}
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xs text-[#5a6c7d] uppercase tracking-wider">{label}</div>
      <div className="font-mono text-sm text-[#2c3e50]">{value}</div>
    </div>
  );
}

function CmaPanel({ cma }: { cma: CmaResponse }) {
  const vsArv = formatDelta(cma.stats.vsArv);
  const vsAvm = formatDelta(cma.stats.vsAvm);
  const vsMed = formatDelta(cma.stats.vsMedianSold);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <CmaStat label="Sold Comps" value={cma.stats.soldCount.toString()} />
        <CmaStat label="Active Comps" value={cma.stats.activeCount.toString()} />
        <CmaStat label="Median Sold" value={formatCurrency(cma.stats.soldMedianPrice)} />
        <CmaStat label="Median $/SqFt" value={cma.stats.soldMedianPpsf ? `$${cma.stats.soldMedianPpsf}` : '--'} />
        <CmaStat label="ARV (Blend)" value={formatCurrency(cma.stats.arvBlend)} />
        <CmaStat label="AVM" value={formatCurrency(cma.avm.price)} />
        <CmaStatColored label="vs ARV" value={vsArv.text} color={vsArv.color} />
        <CmaStatColored label="vs Median Sold" value={vsMed.text} color={vsMed.color} />
      </div>

      {cma.avm.priceMin && cma.avm.priceMax && (
        <div className="font-mono text-xs text-[#5a6c7d] mb-3">
          AVM Range: {formatCurrency(cma.avm.priceMin)} – {formatCurrency(cma.avm.priceMax)}
          {cma.avm.confidence && ` (${cma.avm.confidence})`}
          {cma.stats.vsAvm !== null && <span style={{ color: vsAvm.color }} className="ml-2">vs subject: {vsAvm.text}</span>}
        </div>
      )}

      {cma.comps.sold.length > 0 && (
        <div className="mb-4">
          <h3 className="font-serif text-base text-[#2c3e50] mb-2">Recent Sold Comps</h3>
          <CmaTable comps={cma.comps.sold} kind="sold" />
        </div>
      )}
      {cma.comps.active.length > 0 && (
        <div>
          <h3 className="font-serif text-base text-[#2c3e50] mb-2">Active Comps</h3>
          <CmaTable comps={cma.comps.active} kind="active" />
        </div>
      )}
      {cma.comps.sold.length === 0 && cma.comps.active.length === 0 && (
        <div className="font-mono text-xs text-[#5a6c7d]">No comparable properties found in the local market.</div>
      )}
    </div>
  );
}

function CmaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#5a6c7d] p-2">
      <div className="font-mono text-xs text-[#5a6c7d] uppercase tracking-wider">{label}</div>
      <div className="font-mono text-sm text-[#2c3e50]">{value}</div>
    </div>
  );
}

function CmaStatColored({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border p-2" style={{ borderColor: color }}>
      <div className="font-mono text-xs uppercase tracking-wider" style={{ color }}>{label}</div>
      <div className="font-mono text-sm" style={{ color }}>{value}</div>
    </div>
  );
}

function CmaTable({ comps, kind }: { comps: CmaComp[]; kind: 'sold' | 'active' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-[#2c3e50] text-[#5a6c7d] uppercase">
            <th className="text-left py-2 pr-3">Address</th>
            <th className="text-right pr-3">Beds</th>
            <th className="text-right pr-3">Baths</th>
            <th className="text-right pr-3">SqFt</th>
            <th className="text-right pr-3">Year</th>
            <th className="text-right pr-3">{kind === 'sold' ? 'Sold' : 'List'}</th>
            <th className="text-right pr-3">$/SF</th>
            {kind === 'sold' && <th className="text-right pr-3">Sold Date</th>}
            <th className="text-right pr-3">DOM</th>
            <th className="text-right">Match</th>
          </tr>
        </thead>
        <tbody>
          {comps.map((c, i) => (
            <tr key={c.mlsNumber || i} className="border-b border-[#e5e7eb]">
              <td className="py-2 pr-3 text-[#2c3e50]">
                {c.mlsNumber ? (
                  <Link href={`/property/${encodeURIComponent(c.mlsNumber)}`} className="hover:text-[#8b6914] underline">
                    {c.address}
                  </Link>
                ) : (
                  c.address
                )}
                <div className="text-[#5a6c7d]">{c.city}, {c.state}</div>
              </td>
              <td className="text-right pr-3">{c.beds ?? '--'}</td>
              <td className="text-right pr-3">{c.baths ?? '--'}</td>
              <td className="text-right pr-3">{c.sqft?.toLocaleString() || '--'}</td>
              <td className="text-right pr-3">{c.yearBuilt || '--'}</td>
              <td className="text-right pr-3">{formatCurrency(kind === 'sold' ? c.soldPrice : c.listPrice)}</td>
              <td className="text-right pr-3">{c.pricePerSqft ? `$${c.pricePerSqft}` : '--'}</td>
              {kind === 'sold' && <td className="text-right pr-3">{formatDate(c.soldDate)}</td>}
              <td className="text-right pr-3">{c.daysOnMarket ?? '--'}</td>
              <td className="text-right">{c.distanceScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

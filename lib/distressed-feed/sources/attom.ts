import type { NormalizedListing, SourceResult, AttomListingMetadata } from '../types';

const ATTOM_BASE_URL = 'https://api.gateway.attomdata.com';
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 2000;

function getApiKey(): string | undefined {
  return process.env.ATTOM_API_KEY || process.env.ATTOM_API_KET;
}

interface AttomPreForeclosureProperty {
  identifier?: {
    attomId?: number;
    fips?: string;
    apn?: string;
  };
  address?: {
    line1?: string;
    locality?: string;
    countrySubd?: string;
    postal1?: string;
    oneLine?: string;
    county?: string;
  };
  location?: {
    latitude?: string;
    longitude?: string;
  };
  summary?: {
    proptype?: string;
    yearbuilt?: number;
    propLandUse?: string;
  };
  building?: {
    size?: {
      universalsize?: number;
      livingsize?: number;
    };
    rooms?: {
      beds?: number;
      bathstotal?: number;
    };
  };
  avm?: {
    amount?: {
      value?: number;
    };
  };
  lot?: {
    lotsize1?: number;
    lotsize2?: number;
  };
  foreclosure?: {
    filing?: {
      type?: string;
      date?: string;
      recordingDate?: string;
    };
    lender?: {
      name?: string;
    };
    amount?: {
      default?: number;
      totalDebt?: number;
      openingBid?: number;
    };
    auction?: {
      date?: string;
      openingBid?: number;
    };
  };
}

interface AttomApiResponse {
  status?: {
    code?: number;
    msg?: string;
    total?: number;
    page?: number;
    pagesize?: number;
  };
  property?: AttomPreForeclosureProperty[];
}

function mapPropertyType(attomType: string | undefined): string {
  if (!attomType) return 'single_family';
  const t = attomType.toUpperCase();
  if (t.includes('CONDO') || t.includes('APT')) return 'condo';
  if (t.includes('TOWN')) return 'townhouse';
  if (t.includes('MULTI') || t.includes('DUPLEX') || t.includes('TRIPLEX') || t.includes('FOURPLEX')) return 'multifamily';
  if (t.includes('MOBILE') || t.includes('MANUFACTURED')) return 'manufactured';
  return 'single_family';
}

// ATTOM's /preforeclosure/detail endpoint returns both pre-foreclosure (NOD, NOS, NFS, NTS)
// and lis pendens filings in a single response, differentiated by foreclosure.filing.type.
// There is no separate lis pendens endpoint in ATTOM's property API v1.0.0.
function filingTypeToDistressType(
  filingType: string | undefined
): 'pre_foreclosure' | 'lis_pendens' {
  if (!filingType) return 'pre_foreclosure';
  const t = filingType.toUpperCase();
  if (t.includes('LIS') || t.includes('PENDENS')) return 'lis_pendens';
  return 'pre_foreclosure';
}

async function fetchWithRetry(url: string, apiKey: string): Promise<AttomApiResponse | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'apikey': apiKey,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 404 || response.status === 204) {
        return { status: { code: 400, msg: 'SuccessWithoutResult' }, property: [] };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        if (attempt === 0 && (response.status === 503 || response.status === 504 || response.status === 429)) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 120)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      return await response.json() as AttomApiResponse;
    } catch (err) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  return null;
}

function normalizePreForeclosureListing(
  raw: AttomPreForeclosureProperty
): NormalizedListing | null {
  const addr = raw.address;
  if (!addr?.line1 || !addr?.locality || !addr?.countrySubd || !addr?.postal1) return null;

  const foreclosure = raw.foreclosure;
  const filing = foreclosure?.filing;
  const filingType = filing?.type;
  const distressType = filingTypeToDistressType(filingType);

  const defaultAmount = foreclosure?.amount?.default || 0;
  const totalDebt = foreclosure?.amount?.totalDebt || 0;
  const avmValue = raw.avm?.amount?.value || 0;

  const listPrice = defaultAmount > 0 ? defaultAmount : (totalDebt > 0 ? totalDebt : avmValue);
  if (listPrice <= 0) return null;

  const estimatedValue = avmValue > 0 ? avmValue : undefined;
  const discountPct = estimatedValue && listPrice < estimatedValue
    ? ((estimatedValue - listPrice) / estimatedValue) * 100
    : undefined;

  const attomId = raw.identifier?.attomId;
  const apn = raw.identifier?.apn;
  const fips = raw.identifier?.fips;
  const sourceId = `ATTOM-${attomId || apn || addr.line1}-${addr.postal1}`;

  const lat = raw.location?.latitude ? parseFloat(raw.location.latitude) : undefined;
  const lon = raw.location?.longitude ? parseFloat(raw.location.longitude) : undefined;

  const beds = raw.building?.rooms?.beds || undefined;
  const baths = raw.building?.rooms?.bathstotal || undefined;
  const sqft = raw.building?.size?.universalsize || raw.building?.size?.livingsize || undefined;
  const yearBuilt = raw.summary?.yearbuilt || undefined;
  const lotSqft = raw.lot?.lotsize2 || (raw.lot?.lotsize1 ? Math.round(raw.lot.lotsize1 * 43560) : undefined);

  const nodDate = filing?.date || filing?.recordingDate;
  const lenderName = foreclosure?.lender?.name;
  const auctionDateRaw = foreclosure?.auction?.date;
  const auctionDateParsed = auctionDateRaw ? new Date(auctionDateRaw) : undefined;
  const auctionDate = auctionDateParsed && !isNaN(auctionDateParsed.getTime()) ? auctionDateParsed : undefined;
  const openingBid = foreclosure?.auction?.openingBid || foreclosure?.amount?.openingBid;

  const metadata: AttomListingMetadata = {
    filingType: filingType || 'NOD',
    nodDate,
    defaultAmount: defaultAmount || undefined,
    lenderName: lenderName || undefined,
    auctionOpeningBid: openingBid || undefined,
    totalDebt: totalDebt || undefined,
    apn: apn || undefined,
    fips: fips || undefined,
  };

  const filingLabel = distressType === 'lis_pendens' ? 'Lis Pendens' : (filingType || 'NOD');
  const descParts = [
    `ATTOM ${filingLabel}: ${beds || ''}BR/${baths || ''}BA ${mapPropertyType(raw.summary?.proptype)} in ${addr.locality}, ${addr.countrySubd}.`,
    sqft ? `${sqft.toLocaleString()} sqft.` : '',
    yearBuilt ? `Built ${yearBuilt}.` : '',
    lenderName ? `Lender: ${lenderName}.` : '',
    nodDate ? `Filing date: ${nodDate}.` : '',
    defaultAmount > 0 ? `Default amount: $${defaultAmount.toLocaleString()}.` : '',
    auctionDate ? `Auction scheduled: ${auctionDate.toLocaleDateString()}.` : '',
  ].filter(Boolean);

  const sourceUrl = attomId
    ? `https://www.attomdata.com/solutions/property-data/?propertyId=${attomId}`
    : undefined;

  return {
    source: 'attom',
    sourceId,
    address: addr.line1,
    city: addr.locality,
    state: addr.countrySubd.substring(0, 2).toUpperCase(),
    zip: addr.postal1.substring(0, 10),
    county: addr.county || undefined,
    lat: lat && !isNaN(lat) ? lat : undefined,
    lon: lon && !isNaN(lon) ? lon : undefined,
    propertyType: mapPropertyType(raw.summary?.proptype),
    bedrooms: beds,
    bathrooms: baths,
    sqft,
    lotSqft,
    yearBuilt,
    listPrice,
    estimatedValue,
    discountPct,
    distressType,
    sourceUrl,
    photos: [],
    description: descParts.join(' '),
    auctionDate,
    metadata,
  };
}

async function fetchPreForeclosureForState(
  apiKey: string,
  state: string,
  errors: string[]
): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const startDate = cutoffDate.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${ATTOM_BASE_URL}/propertyapi/v1.0.0/preforeclosure/detail`);
    url.searchParams.set('state', state);
    url.searchParams.set('startcutoffdate', startDate);
    url.searchParams.set('endcutoffdate', endDate);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pagesize', String(PAGE_SIZE));

    let data: AttomApiResponse | null = null;
    try {
      data = await fetchWithRetry(url.toString(), apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`ATTOM pre-foreclosure ${state} page ${page}: ${msg}`);
      break;
    }

    if (!data) break;

    if (data.status?.msg === 'SuccessWithoutResult' || !data.property?.length) break;

    for (const raw of data.property) {
      const normalized = normalizePreForeclosureListing(raw);
      if (normalized) listings.push(normalized);
    }

    const total = data.status?.total || 0;
    const fetched = page * PAGE_SIZE;
    if (fetched >= total) break;

    await new Promise(r => setTimeout(r, 500));
  }

  return listings;
}

export async function fetchAttomListings(
  states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']
): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[ATTOM] ATTOM_API_KEY not configured — skipping pre-foreclosure fetch');
    return {
      source: 'attom',
      listings: [],
      errors: ['ATTOM_API_KEY not configured'],
      fetchedAt: new Date(),
    };
  }

  for (const state of states) {
    try {
      const stateListings = await fetchPreForeclosureForState(apiKey, state, errors);
      allListings.push(...stateListings);
      await new Promise(r => setTimeout(r, 750));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`ATTOM ${state}: ${msg}`);
    }
  }

  return {
    source: 'attom',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}

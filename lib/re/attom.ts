const ATTOM_BASE = 'https://api.attomdata.com';

function getApiKey(): string | null {
  return process.env.ATTOM_API_KEY || null;
}

function attomHeaders(): HeadersInit {
  return {
    'apikey': getApiKey() || '',
    'Accept': 'application/json',
  };
}

export interface AttomIdentifier {
  attomId: number;
  fips: string;
  apn: string;
}

export interface AttomLocation {
  latitude: string;
  longitude: string;
  line1: string;
  line2: string;
  locality: string;
  countrySubd: string;
  postal1: string;
  county: string;
  accuracy?: string;
}

export interface AttomBuildingSize {
  universalSize: number;
  livingSize: number;
  lotSize2?: number;
}

export interface AttomRooms {
  beds: number;
  bathsTotal: number;
  bathsFull: number;
}

export interface AttomBuilding {
  size: AttomBuildingSize;
  rooms: AttomRooms;
  summary: {
    yearBuilt: number;
    condition?: string;
    storyDesc?: string;
    unitsCount?: number;
  };
  parking?: { garageType?: string };
  interior?: { bsmtType?: string };
}

export interface AttomLot {
  lotsize2?: number;
  zoningHigh?: string;
}

export interface AttomSaleAmount {
  saleAmt?: number;
  saleDocType?: string;
  pricePerSqft?: number;
  saleCode?: string;
}

export interface AttomSaleRecord {
  saleTransDate: string;
  saleDocNum?: string;
  amount?: AttomSaleAmount;
  seller1FullName?: string;
  buyer1FullName?: string;
  multi?: { isArmsLength?: boolean };
}

export interface AttomAssessedValues {
  assdTtlValue?: number;
  assdLandValue?: number;
  assdImprValue?: number;
}

export interface AttomMarketValues {
  mktTtlValue?: number;
  mktLandValue?: number;
  mktImprValue?: number;
}

export interface AttomTax {
  taxAmt?: number;
  taxYear?: number | string;
}

export interface AttomAssessment {
  assessed?: AttomAssessedValues;
  market?: AttomMarketValues;
  tax?: AttomTax;
}

export interface AttomAssessmentHistory {
  assessedYear: number;
  assessed?: AttomAssessedValues;
  market?: AttomMarketValues;
  tax?: AttomTax;
  calcTaxRate?: number;
}

export interface AttomAvmAmount {
  value?: number;
  high?: number;
  low?: number;
  scr?: number;
}

export interface AttomProperty {
  identifier: AttomIdentifier;
  location: AttomLocation;
  address?: { line1: string; line2: string; locality: string; countrySubd: string; postal1: string };
  summary?: { propType?: string; yearBuilt?: number; propClass?: string };
  building?: AttomBuilding;
  lot?: AttomLot;
  assessment?: AttomAssessment;
  sale?: AttomSaleRecord;
  avm?: { amount?: AttomAvmAmount; eventDate?: string };
}

export interface AttomSaleHistoryProperty {
  identifier: AttomIdentifier;
  address?: { line1: string; line2: string };
  salehistory?: AttomSaleRecord[];
}

export interface AttomAssessmentHistoryProperty {
  identifier: AttomIdentifier;
  address?: { line1: string; line2: string };
  assessmenthistory?: AttomAssessmentHistory[];
}

export function isAttomConfigured(): boolean {
  return !!getApiKey();
}

export async function fetchAttomExpandedProfile(
  address1: string,
  address2: string
): Promise<AttomProperty | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const url =
      `${ATTOM_BASE}/v4/property/expandedprofile` +
      `?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;

    const res = await fetch(url, {
      headers: attomHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.property;
    if (!Array.isArray(props) || props.length === 0) return null;
    return props[0] as AttomProperty;
  } catch {
    return null;
  }
}

export async function fetchAttomSalesHistory(
  address1: string,
  address2: string
): Promise<AttomSaleRecord[]> {
  const key = getApiKey();
  if (!key) return [];

  try {
    const url =
      `${ATTOM_BASE}/v4/property/saleshistory` +
      `?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;

    const res = await fetch(url, {
      headers: attomHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const props = data?.property as AttomSaleHistoryProperty[] | undefined;
    if (!Array.isArray(props) || props.length === 0) return [];
    return props[0]?.salehistory || [];
  } catch {
    return [];
  }
}

export async function fetchAttomTaxHistory(
  address1: string,
  address2: string
): Promise<AttomAssessmentHistory[]> {
  const key = getApiKey();
  if (!key) return [];

  try {
    const url =
      `${ATTOM_BASE}/v4/assessment/history` +
      `?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;

    const res = await fetch(url, {
      headers: attomHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const props = data?.property as AttomAssessmentHistoryProperty[] | undefined;
    if (!Array.isArray(props) || props.length === 0) return [];
    return props[0]?.assessmenthistory || [];
  } catch {
    return [];
  }
}

export function parseAttomAddress(prop: AttomProperty): {
  address1: string;
  address2: string;
} {
  const loc = prop.location || prop.address;
  if (!loc) return { address1: '', address2: '' };
  return {
    address1: loc.line1 || '',
    address2: [loc.locality, loc.countrySubd, loc.postal1].filter(Boolean).join(', '),
  };
}

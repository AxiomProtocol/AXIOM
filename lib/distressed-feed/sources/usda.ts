import type { NormalizedListing, SourceResult } from '../types';

const USDA_BASE = 'https://properties.sc.egov.usda.gov/resales';

const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'FL': '12', 'GA': '13', 'MS': '28',
  'NC': '37', 'SC': '45', 'TN': '47', 'TX': '48',
  'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
  'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22',
  'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26',
  'MN': '27', 'MO': '29', 'MT': '30', 'NE': '31',
  'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35',
  'NY': '36', 'ND': '38', 'OH': '39', 'OK': '40',
  'OR': '41', 'PA': '42', 'RI': '44', 'SD': '46',
  'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53',
  'WV': '54', 'WI': '55', 'WY': '56',
};

interface UsdaCounty {
  countyCode: string;
  countyName: string;
}

interface UsdaPropertyRow {
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  photos: string[];
  sourceUrl: string;
  sourceId: string;
}

function normalizePropertyType(uType: string | undefined): string {
  if (!uType) return 'single_family';
  const t = uType.toLowerCase();
  if (t.includes('condo')) return 'condo';
  if (t.includes('town')) return 'townhouse';
  if (t.includes('multi')) return 'multifamily';
  if (t.includes('mobile') || t.includes('manufactured')) return 'manufactured';
  return 'single_family';
}

async function getSession(): Promise<string | null> {
  try {
    const response = await fetch(`${USDA_BASE}/public/home`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const setCookies = response.headers.getSetCookie?.() || [];
    return setCookies.map(c => c.split(';')[0]).join('; ');
  } catch {
    return null;
  }
}

async function getActiveCounties(stateFips: string, cookies: string): Promise<UsdaCounty[]> {
  try {
    const url = `${USDA_BASE}/public/getCountiesOfStateWithActiveProperties?stateCode=${stateFips}&searchFormName=SFH`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    return await response.json() as UsdaCounty[];
  } catch {
    return [];
  }
}

async function searchProperties(stateFips: string, countyCode: string, cookies: string): Promise<string> {
  try {
    const body = new URLSearchParams({
      stateCode: stateFips,
      city: '',
      zipCode: '',
      countyCode: countyCode,
      propertyType: 'Single Family',
      searchFormName: 'SFH',
      Search: 'Search',
      countyCodeLast: countyCode,
    });

    const response = await fetch(`${USDA_BASE}/public/searchSFH`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${USDA_BASE}/public/searchSFH`,
        'Origin': 'https://properties.sc.egov.usda.gov',
      },
      body: body.toString(),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  }
}

function parseHtmlListings(html: string, state: string, countyName: string): UsdaPropertyRow[] {
  const results: UsdaPropertyRow[] = [];

  const propertyLinks = html.match(/viewProperty[^"']*/g) || [];
  const rows = html.match(/<tr[^>]*class="[^"]*property[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  for (const row of rows) {
    const cells: string[] = [];
    let match;
    while ((match = tdPattern.exec(row)) !== null) {
      cells.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    tdPattern.lastIndex = 0;

    if (cells.length >= 5) {
      const linkMatch = row.match(/viewProperty\/(\d+)/);
      const id = linkMatch ? linkMatch[1] : `usda-${cells[0]}-${cells[1]}`;

      results.push({
        address: cells[0] || '',
        city: cells[1] || '',
        state: state,
        zip: cells[2] || '',
        county: countyName.replace(/\s*\(\d+\)\s*$/, ''),
        price: parseFloat((cells[3] || '0').replace(/[$,]/g, '')) || 0,
        bedrooms: parseInt(cells[4] || '0', 10) || 0,
        bathrooms: parseInt(cells[5] || '0', 10) || 0,
        sqft: parseInt((cells[6] || '0').replace(/,/g, ''), 10) || 0,
        yearBuilt: parseInt(cells[7] || '0', 10) || 0,
        propertyType: 'single_family',
        photos: [],
        sourceUrl: linkMatch ? `${USDA_BASE}/public/viewProperty/${id}` : '',
        sourceId: id,
      });
    }
  }

  return results;
}

export async function fetchUsdaListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  const cookies = await getSession();
  if (!cookies) {
    errors.push('USDA: Failed to establish session');
    return { source: 'usda', listings: [], errors, fetchedAt: new Date() };
  }

  for (const state of states) {
    const fips = STATE_FIPS[state];
    if (!fips) {
      errors.push(`USDA ${state}: Unknown FIPS code`);
      continue;
    }

    try {
      const counties = await getActiveCounties(fips, cookies);

      let stateTotal = 0;
      for (const county of counties) {
        const countMatch = county.countyName.match(/\((\d+)\)/);
        const expectedCount = countMatch ? parseInt(countMatch[1], 10) : 0;
        stateTotal += expectedCount;
      }

      if (counties.length === 0) {
        continue;
      }

      for (const county of counties) {
        const html = await searchProperties(fips, county.countyCode, cookies);
        const parsed = parseHtmlListings(html, state, county.countyName);

        for (const prop of parsed) {
          if (prop.price <= 0) continue;

          allListings.push({
            source: 'usda',
            sourceId: `USDA-${state}-${prop.sourceId}`,
            address: prop.address,
            city: prop.city,
            state: state,
            zip: prop.zip,
            county: prop.county,
            propertyType: normalizePropertyType(prop.propertyType),
            bedrooms: prop.bedrooms || undefined,
            bathrooms: prop.bathrooms || undefined,
            sqft: prop.sqft || undefined,
            yearBuilt: prop.yearBuilt || undefined,
            listPrice: prop.price,
            distressType: 'government',
            sourceUrl: prop.sourceUrl || undefined,
            photos: prop.photos,
            description: `USDA Rural Development foreclosure in ${prop.city}, ${state}. ${prop.county} County. USDA financing eligible.`,
          });
        }

        await new Promise(r => setTimeout(r, 500));
      }

      if (stateTotal > 0 && allListings.filter(l => l.state === state).length === 0) {
        errors.push(`USDA ${state}: ${stateTotal} properties reported in ${counties.length} counties but HTML parsing returned 0. Server may require JS execution.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`USDA ${state}: ${message}`);
    }
  }

  return {
    source: 'usda',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}

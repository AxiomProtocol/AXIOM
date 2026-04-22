import type { NormalizedListing, SourceResult } from '../types';

interface SheriffSaleSourceInfo {
  state: string;
  name: string;
  url: string;
  auctionType: 'sheriff_sale' | 'foreclosure_auction' | 'trustee_sale';
  frequency: string;
  notes: string;
}

const SHERIFF_SALE_SOURCES: Record<string, SheriffSaleSourceInfo[]> = {
  GA: [
    {
      state: 'GA',
      name: 'Georgia Superior Court Foreclosures',
      url: 'https://www.georgiapublicnotice.com',
      auctionType: 'foreclosure_auction',
      frequency: 'First Tuesday of each month',
      notes: 'Georgia foreclosure sales occur on the courthouse steps on the first Tuesday. Legal notices published in county legal organs 4 weeks prior.',
    },
    {
      state: 'GA',
      name: 'Fulton County Sheriff Sales',
      url: 'https://www.fultoncountysheriff.org',
      auctionType: 'sheriff_sale',
      frequency: 'First Tuesday of each month',
      notes: 'Fulton County (Atlanta) sheriff conducts foreclosure sales. Published via Daily Report legal newspaper.',
    },
    {
      state: 'GA',
      name: 'Auction.com Georgia Foreclosures',
      url: 'https://www.auction.com/residential/georgia/',
      auctionType: 'foreclosure_auction',
      frequency: 'Continuous online auctions',
      notes: 'Major platform for bank-owned and foreclosure auctions. API access requires partnership agreement.',
    },
  ],
  TX: [
    {
      state: 'TX',
      name: 'Texas Trustee Sales',
      url: 'https://www.foreclosurelistings.com/state/texas',
      auctionType: 'trustee_sale',
      frequency: 'First Tuesday of each month',
      notes: 'Texas is a non-judicial foreclosure state. Trustee sales at county courthouse. Some counties post online.',
    },
    {
      state: 'TX',
      name: 'Harris County Foreclosures',
      url: 'https://www.harriscountyfcl.com',
      auctionType: 'trustee_sale',
      frequency: 'First Tuesday of each month',
      notes: 'Harris County (Houston) trustee sales. Lists posted 21+ days before sale date.',
    },
    {
      state: 'TX',
      name: 'Auction.com Texas Foreclosures',
      url: 'https://www.auction.com/residential/texas/',
      auctionType: 'foreclosure_auction',
      frequency: 'Continuous online auctions',
      notes: 'Major platform for bank-owned and foreclosure auctions in Texas.',
    },
  ],
  NC: [
    {
      state: 'NC',
      name: 'North Carolina Foreclosure Sales',
      url: 'https://www.ncforeclosures.gov',
      auctionType: 'foreclosure_auction',
      frequency: 'Varies by county',
      notes: 'NC uses power of sale foreclosure. Clerk of court supervises. 10-day upset bid period after initial sale.',
    },
    {
      state: 'NC',
      name: 'Mecklenburg County Foreclosures',
      url: 'https://www.mecknc.gov',
      auctionType: 'foreclosure_auction',
      frequency: 'Weekly',
      notes: 'Mecklenburg County (Charlotte) posts foreclosure notices. Sales at county courthouse.',
    },
    {
      state: 'NC',
      name: 'Auction.com NC Foreclosures',
      url: 'https://www.auction.com/residential/north-carolina/',
      auctionType: 'foreclosure_auction',
      frequency: 'Continuous online auctions',
      notes: 'Major platform for bank-owned and foreclosure auctions in NC.',
    },
  ],
};

interface SourceStatus {
  name: string;
  state: string;
  url: string;
  status: 'active' | 'unavailable' | 'blocked' | 'manual_only';
  statusReason: string;
  auctionType: string;
  frequency: string;
  lastAttempt: Date;
}

async function attemptFetch(url: string): Promise<{ ok: boolean; status: number; blocked: boolean; bodySnippet: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const text = await response.text();
    const bodySnippet = text.substring(0, 500);

    const blocked = bodySnippet.toLowerCase().includes('cloudflare') ||
      bodySnippet.toLowerCase().includes('captcha') ||
      bodySnippet.toLowerCase().includes('challenge-platform') ||
      bodySnippet.toLowerCase().includes('just a moment') ||
      bodySnippet.toLowerCase().includes('access denied') ||
      bodySnippet.toLowerCase().includes('bot detection') ||
      response.status === 403;

    return { ok: response.ok, status: response.status, blocked, bodySnippet };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, blocked: false, bodySnippet: `Error: ${message}` };
  }
}

export async function fetchSheriffSaleListings(states: string[] = ['GA', 'TX', 'NC']): Promise<SourceResult & { sourceStatuses: SourceStatus[] }> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];
  const sourceStatuses: SourceStatus[] = [];

  for (const state of states) {
    const sources = SHERIFF_SALE_SOURCES[state];
    if (!sources) {
      continue;
    }

    for (const source of sources) {
      const result = await attemptFetch(source.url);

      let status: SourceStatus['status'] = 'unavailable';
      let statusReason = '';

      if (result.blocked) {
        status = 'blocked';
        statusReason = `Source unavailable: Cloudflare/bot protection detected at ${source.url}`;
        errors.push(`Sheriff Sale ${source.name}: ${statusReason}`);
      } else if (!result.ok) {
        status = 'unavailable';
        statusReason = `Source unavailable: HTTP ${result.status} from ${source.url}`;
        errors.push(`Sheriff Sale ${source.name}: ${statusReason}`);
      } else {
        const hasStructuredData = result.bodySnippet.includes('<table') ||
          result.bodySnippet.includes('application/json') ||
          result.bodySnippet.includes('"properties"') ||
          result.bodySnippet.includes('"listings"') ||
          result.bodySnippet.includes('"auctions"');

        if (hasStructuredData) {
          status = 'active';
          statusReason = 'Source accessible but requires custom parser for structured data extraction';
        } else {
          status = 'manual_only';
          statusReason = `Source accessible but data is in unstructured format (PDF, JS-rendered, or manual lookup required). ${source.notes}`;
        }
        errors.push(`Sheriff Sale ${source.name}: ${statusReason}`);
      }

      sourceStatuses.push({
        name: source.name,
        state: source.state,
        url: source.url,
        status,
        statusReason,
        auctionType: source.auctionType,
        frequency: source.frequency,
        lastAttempt: new Date(),
      });

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return {
    source: 'tax_sale',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
    sourceStatuses,
  };
}

export function getSheriffSaleSourceInfo(): Record<string, SheriffSaleSourceInfo[]> {
  return SHERIFF_SALE_SOURCES;
}

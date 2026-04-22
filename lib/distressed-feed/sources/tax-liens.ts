import type { NormalizedListing, SourceResult } from '../types';

interface TaxLienSourceInfo {
  state: string;
  name: string;
  url: string;
  saleType: 'tax_deed' | 'tax_lien_certificate' | 'hybrid';
  frequency: string;
  notes: string;
}

const TAX_LIEN_SOURCES: Record<string, TaxLienSourceInfo[]> = {
  GA: [
    {
      state: 'GA',
      name: 'Georgia Tax Commissioner Sales',
      url: 'https://www.atlantapublicnotices.com/fp/tax-sales.aspx',
      saleType: 'tax_deed',
      frequency: 'First Tuesday of each month',
      notes: 'Georgia conducts tax deed sales. Properties sold at county courthouse steps. Each county publishes 4 weeks before sale in the local legal organ.',
    },
    {
      state: 'GA',
      name: 'Fulton County Tax Sale',
      url: 'https://www.fultoncountytaxcommissioner.org',
      saleType: 'tax_deed',
      frequency: 'Monthly',
      notes: 'Fulton County (Atlanta) tax commissioner posts upcoming sales. Often protected by Cloudflare or JS rendering.',
    },
    {
      state: 'GA',
      name: 'DeKalb County Tax Sale',
      url: 'https://www.dekalbcountyga.gov/tax-commissioner/tax-sales',
      saleType: 'tax_deed',
      frequency: 'Monthly',
      notes: 'DeKalb County posts tax sale lists as PDFs.',
    },
  ],
  TX: [
    {
      state: 'TX',
      name: 'Texas Constable Tax Sales',
      url: 'https://www.txauction.com',
      saleType: 'tax_deed',
      frequency: 'First Tuesday of each month',
      notes: 'Texas conducts tax deed sales at county courthouse. Major counties use txauction.com for online listings.',
    },
    {
      state: 'TX',
      name: 'Harris County Tax Sale',
      url: 'https://www.hctax.net/property/taxsales',
      saleType: 'tax_deed',
      frequency: 'Monthly',
      notes: 'Harris County (Houston) tax office posts upcoming sales. Lists available as downloadable CSV/PDF.',
    },
    {
      state: 'TX',
      name: 'Dallas County Tax Sale',
      url: 'https://www.dallascounty.org/department/tax/taxsale.php',
      saleType: 'tax_deed',
      frequency: 'Monthly',
      notes: 'Dallas County posts tax foreclosure sale lists.',
    },
  ],
  NC: [
    {
      state: 'NC',
      name: 'North Carolina County Tax Foreclosures',
      url: 'https://www.nctaxsales.com',
      saleType: 'tax_lien_certificate',
      frequency: 'Varies by county',
      notes: 'NC counties sell tax lien certificates. In-rem foreclosure process. County-specific timing.',
    },
    {
      state: 'NC',
      name: 'Mecklenburg County Tax Sale',
      url: 'https://www.mecknc.gov/TaxCollections/Pages/TaxForeclosure.aspx',
      saleType: 'tax_lien_certificate',
      frequency: 'Semi-annual',
      notes: 'Mecklenburg County (Charlotte) posts tax foreclosure lists. Dynamic web pages require JS.',
    },
  ],
};

interface SourceStatus {
  name: string;
  state: string;
  url: string;
  status: 'active' | 'unavailable' | 'blocked' | 'manual_only';
  statusReason: string;
  saleType: string;
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

export async function fetchTaxLienListings(states: string[] = ['GA', 'TX', 'NC']): Promise<SourceResult & { sourceStatuses: SourceStatus[] }> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];
  const sourceStatuses: SourceStatus[] = [];

  for (const state of states) {
    const sources = TAX_LIEN_SOURCES[state];
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
        errors.push(`Tax Lien ${source.name}: ${statusReason}`);
      } else if (!result.ok) {
        status = 'unavailable';
        statusReason = `Source unavailable: HTTP ${result.status} from ${source.url}`;
        errors.push(`Tax Lien ${source.name}: ${statusReason}`);
      } else {
        const hasStructuredData = result.bodySnippet.includes('<table') ||
          result.bodySnippet.includes('application/json') ||
          result.bodySnippet.includes('"properties"') ||
          result.bodySnippet.includes('"listings"');

        if (hasStructuredData) {
          status = 'active';
          statusReason = 'Source accessible but requires custom parser for structured data extraction';
        } else {
          status = 'manual_only';
          statusReason = `Source accessible but data is in unstructured format (PDF, JS-rendered, or manual lookup required). ${source.notes}`;
        }
        errors.push(`Tax Lien ${source.name}: ${statusReason}`);
      }

      sourceStatuses.push({
        name: source.name,
        state: source.state,
        url: source.url,
        status,
        statusReason,
        saleType: source.saleType,
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

export function getTaxLienSourceInfo(): Record<string, TaxLienSourceInfo[]> {
  return TAX_LIEN_SOURCES;
}

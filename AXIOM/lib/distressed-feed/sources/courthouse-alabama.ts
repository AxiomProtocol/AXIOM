/**
 * Alabama Courthouse Scraper
 *
 * Sources:
 * 1. Jefferson County Probate Court — foreclosure notices posted under
 *    Alabama Code §35-10-12. Birmingham metro is AL's largest market.
 *    https://www.jccal.org/Sites/Jefferson_County/Pages/Page_1064.aspx
 *
 * 2. Alabama Department of Revenue — Land Sold For Taxes registry.
 *    Properties forfeited for delinquent ad valorem tax under §40-10-1.
 *    https://www.revenue.alabama.gov/property-tax/taxes-administered/land-sold-for-taxes/
 *
 * All data is public record under Alabama Open Records Act §36-12-40.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `al-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Jefferson County Probate Court — foreclosure notice list
async function scrapeJeffersonCountyForeclosures(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.jccal.org/Sites/Jefferson_County/Pages/Page_1064.aspx';

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const col0 = $(cells[0]).text().trim();
      const col1 = $(cells[1]).text().trim();
      const col2 = cells.length > 2 ? $(cells[2]).text().trim() : '';
      if (!col0 || col0.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('jeff-fc', `row-${i}-${col0.slice(0, 8)}`),
        address: col0,
        city: 'Birmingham',
        state: 'AL',
        zip: '',
        county: 'Jefferson',
        propertyType: 'single_family',
        listPrice: parseFloat((col2 || col1).replace(/[^0-9.]/g, '')) || 0,
        distressType: 'pre_foreclosure',
        sourceUrl: url,
        photos: [],
        description: [col0, col1, col2].filter(Boolean).join(' | ').slice(0, 300),
        metadata: { filingType: 'Foreclosure Notice', source: 'Jefferson County Probate Court AL' },
      });
    });

    // Card / list fallback
    if (listings.length === 0) {
      $('.property, .listing, article, .item').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const address = lines[0] || 'Jefferson County AL';
        listings.push({
          source: 'courthouse',
          sourceId: stableId('jeff-fc', `card-${i}`),
          address,
          city: 'Birmingham',
          state: 'AL',
          zip: '',
          county: 'Jefferson',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Foreclosure Notice', source: 'Jefferson County Probate Court AL (card)' },
        });
      });
    }

    // Downloadable file links
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;
      listings.push({
        source: 'courthouse',
        sourceId: stableId('jeff-fc', `file-${i}`),
        address: 'Jefferson County Foreclosure List',
        city: 'Birmingham',
        state: 'AL',
        zip: '',
        county: 'Jefferson',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: href.startsWith('http') ? href : `https://www.jccal.org${href}`,
        photos: [],
        description: `Foreclosure list download: ${text}`,
        metadata: { filingType: 'Foreclosure List Download', source: 'Jefferson County Probate Court AL', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AL Jefferson County Probate: ${msg}`);
  }

  return listings;
}

// Alabama Department of Revenue — Land Sold For Taxes
async function scrapeAlaDorTaxSales(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.revenue.alabama.gov/property-tax/taxes-administered/land-sold-for-taxes/';

  try {
    await sleep(DELAY);
    const response = await axios.get(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const parcel  = $(cells[0]).text().trim();
      const address = $(cells[1]).text().trim();
      const county  = cells.length > 2 ? $(cells[2]).text().trim() : 'Jefferson';
      const amount  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('aldor-tax', parcel || `row-${i}`),
        address,
        city: county,
        state: 'AL',
        zip: '',
        county,
        propertyType: 'single_family',
        listPrice: parseFloat(amount.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'tax_lien',
        sourceUrl: url,
        photos: [],
        description: `Parcel: ${parcel} | County: ${county} | Delinquent: ${amount}`,
        metadata: { filingType: 'Land Sold For Taxes', source: 'Alabama Department of Revenue', parcel },
      });
    });

    // Downloadable county tax sale lists
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"], a[href*="county"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href || text.length < 3) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('aldor-tax', `file-${i}`),
        address: `Alabama Tax Sale — ${text}`,
        city: 'Montgomery',
        state: 'AL',
        zip: '',
        county: 'Montgomery',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'tax_lien',
        sourceUrl: href.startsWith('http') ? href : `https://www.revenue.alabama.gov${href}`,
        photos: [],
        description: `AL tax sale list: ${text}`,
        metadata: { filingType: 'Tax Sale List', source: 'Alabama DOR Land Sold For Taxes', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AL DOR Tax Sales: ${msg}`);
  }

  return listings;
}

export async function fetchAlabamaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [jeff, aldor] = await Promise.all([
    scrapeJeffersonCountyForeclosures(errors),
    scrapeAlaDorTaxSales(errors),
  ]);
  return {
    source: 'courthouse-alabama',
    listings: [...jeff, ...aldor],
    errors,
    fetchedAt: new Date(),
  };
}

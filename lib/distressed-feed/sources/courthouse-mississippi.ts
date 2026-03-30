/**
 * Mississippi Courthouse Scraper
 *
 * Sources:
 * 1. Mississippi Land Commissioner — state-owned lands forfeited for unpaid
 *    taxes (§29-1-1 et seq.). The MLC publishes a public inventory of lands
 *    available for purchase.
 *    https://www.mlc.state.ms.us/
 *
 * 2. Hinds County Chancery Court (Jackson metro) — chancery courts handle
 *    mortgage foreclosures in MS under the deed of trust statute (§89-1-55).
 *    https://www.hindscountyms.gov/departments/chancery-court
 *
 * All data is public record under Mississippi Public Records Act §25-61-1.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `ms-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Mississippi Land Commissioner — forfeited tax lands inventory
async function scrapeMsLandCommissioner(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.mlc.state.ms.us/';

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

      const col0   = $(cells[0]).text().trim();
      const col1   = $(cells[1]).text().trim();
      const county = cells.length > 2 ? $(cells[2]).text().trim() : 'Hinds';
      const price  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!col0 || col0.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('mlc', `row-${i}-${col0.slice(0, 8)}`),
        address: col0,
        city: county,
        state: 'MS',
        zip: '',
        county,
        propertyType: 'single_family',
        listPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'tax_lien',
        sourceUrl: url,
        photos: [],
        description: [col0, col1, county].filter(Boolean).join(' | ').slice(0, 300),
        metadata: { filingType: 'Forfeited Tax Land', source: 'Mississippi Land Commissioner' },
      });
    });

    // Card/listing fallback
    if (listings.length === 0) {
      $('.property-item, .land-item, .listing, article').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        listings.push({
          source: 'courthouse',
          sourceId: stableId('mlc-card', `${i}`),
          address: lines[0] || 'Mississippi Forfeited Land',
          city: lines[1] || 'Jackson',
          state: 'MS',
          zip: '',
          county: 'Hinds',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'tax_lien',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Forfeited Tax Land', source: 'Mississippi Land Commissioner (card)' },
        });
      });
    }

    // Links to county-level tax sale listings
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"], a[href*="county"], a[href*="land"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href || text.length < 3) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('mlc', `file-${i}`),
        address: `Mississippi Forfeited Land — ${text}`,
        city: 'Jackson',
        state: 'MS',
        zip: '',
        county: 'Hinds',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'tax_lien',
        sourceUrl: href.startsWith('http') ? href : `https://www.mlc.state.ms.us${href}`,
        photos: [],
        description: `MS forfeited land: ${text}`,
        metadata: { filingType: 'Forfeited Tax Land List', source: 'Mississippi Land Commissioner', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`MS Land Commissioner: ${msg}`);
  }

  return listings;
}

// Hinds County Chancery Court — Jackson metro foreclosure filings
async function scrapeHindsChanceryCourt(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.hindscountyms.gov/departments/chancery-court';

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

      const caseNo  = $(cells[0]).text().trim();
      const address = $(cells[1]).text().trim();
      const dateStr = cells.length > 2 ? $(cells[2]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('hinds-cc', caseNo || `row-${i}`),
        address,
        city: 'Jackson',
        state: 'MS',
        zip: '',
        county: 'Hinds',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: url,
        photos: [],
        description: `Case: ${caseNo} | Sale date: ${dateStr}`,
        metadata: { filingType: 'Deed of Trust Foreclosure', source: 'Hinds County Chancery Court MS', caseNo, saleDate: dateStr },
      });
    });

    // Generic fallback
    if (listings.length === 0) {
      $('p, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length < 15 || text.length > 400) return;
        if (!text.match(/\d{3,5}\s+\w/)) return; // loose street address check

        listings.push({
          source: 'courthouse',
          sourceId: stableId('hinds-cc', `para-${i}`),
          address: text.slice(0, 120),
          city: 'Jackson',
          state: 'MS',
          zip: '',
          county: 'Hinds',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Foreclosure Filing', source: 'Hinds County Chancery Court MS (fallback)' },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`MS Hinds County Chancery: ${msg}`);
  }

  return listings;
}

export async function fetchMississippiCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [mlc, hinds] = await Promise.all([
    scrapeMsLandCommissioner(errors),
    scrapeHindsChanceryCourt(errors),
  ]);
  return {
    source: 'courthouse-mississippi',
    listings: [...mlc, ...hinds],
    errors,
    fetchedAt: new Date(),
  };
}

/**
 * North Carolina Courthouse Scraper
 *
 * Sources:
 * 1. NC Courts Foreclosure Calendar (AOC) — statewide public foreclosure sale
 *    notices posted by clerks of superior court under G.S. 45-21.17.
 *    https://www.nccourts.gov/court-dates/foreclosures
 *
 * 2. Wake County Tax Administration — delinquent real estate tax listings.
 *    https://www.wake.gov/departments-government/tax-administration/
 *    find-real-estate-bills/delinquent-real-estate
 *
 * All data is public record under NC General Statutes.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `nc-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// NC Courts foreclosure calendar — public hearing notices
async function scrapeNcCourtForeclosures(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const baseUrl = 'https://www.nccourts.gov/court-dates/foreclosures';

  try {
    const response = await axios.get(baseUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    // The NC Courts page renders foreclosure notices in a tabular or card layout.
    // Try structured table rows first.
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const caseNo  = $(cells[0]).text().trim();
      const address = $(cells[1]).text().trim() || $(cells[2]).text().trim();
      const county  = cells.length > 3 ? $(cells[3]).text().trim() : 'Wake';
      const dateStr = cells.length > 4 ? $(cells[4]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('aoc', caseNo || `row-${i}`),
        address,
        city: county,
        state: 'NC',
        zip: '',
        county,
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: baseUrl,
        photos: [],
        description: `Case: ${caseNo} | Hearing: ${dateStr} | County: ${county}`,
        metadata: { filingType: 'Foreclosure Hearing', source: 'NC Courts AOC', caseNo, hearingDate: dateStr },
      });
    });

    // Card / list fallback
    if (listings.length === 0) {
      $('.foreclosure-item, .case-item, .hearing-item, article').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const address = lines[0] || 'North Carolina';
        const county  = lines[1] || 'Wake';

        listings.push({
          source: 'courthouse',
          sourceId: stableId('aoc-card', `${i}-${address.slice(0, 12)}`),
          address,
          city: county,
          state: 'NC',
          zip: '',
          county,
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: baseUrl,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Foreclosure Notice', source: 'NC Courts AOC (card)' },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`NC AOC Foreclosures: ${msg}`);
  }

  return listings;
}

// Wake County Tax Administration — delinquent tax real estate
async function scrapeWakeCountyTax(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.wake.gov/departments-government/tax-administration/find-real-estate-bills/delinquent-real-estate';

  try {
    await sleep(DELAY);
    const response = await axios.get(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    // Delinquent lists are often in tables or downloadable files
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const col0 = $(cells[0]).text().trim();
      const col1 = $(cells[1]).text().trim();
      const col2 = cells.length > 2 ? $(cells[2]).text().trim() : '';
      if (!col0 || col0.length < 5) return;

      const priceRaw = col2 || col1;
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('wake-tax', `row-${i}-${col0.slice(0, 8)}`),
        address: col0,
        city: 'Raleigh',
        state: 'NC',
        zip: '',
        county: 'Wake',
        propertyType: 'single_family',
        listPrice: price,
        distressType: 'tax_lien',
        sourceUrl: url,
        photos: [],
        description: [col0, col1, col2].filter(Boolean).join(' | ').slice(0, 300),
        metadata: { filingType: 'Delinquent Tax', source: 'Wake County Tax Administration NC' },
      });
    });

    // Look for downloadable list links
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('wake-tax', `file-${i}`),
        address: 'Wake County Delinquent Tax List',
        city: 'Raleigh',
        state: 'NC',
        zip: '',
        county: 'Wake',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'tax_lien',
        sourceUrl: href.startsWith('http') ? href : `https://www.wake.gov${href}`,
        photos: [],
        description: `Delinquent tax list: ${text}`,
        metadata: { filingType: 'Delinquent Tax List Download', source: 'Wake County Tax Administration NC', listUrl: href },
      });
    });

    // Mecklenburg County supplemental — Charlotte foreclosure lis pendens
    await sleep(DELAY);
    const meckUrl = 'https://polaris3g.mecklenburgcountync.gov/';
    try {
      const meckResp = await axios.get(meckUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        timeout: 12000,
      });
      const $m = cheerio.load(meckResp.data as string);

      $m('table tr').each((i, row) => {
        if (i === 0) return;
        const cells = $m(row).find('td');
        if (cells.length < 2) return;
        const addr = $m(cells[0]).text().trim();
        if (!addr || addr.length < 5) return;

        listings.push({
          source: 'courthouse',
          sourceId: stableId('meck', `row-${i}-${addr.slice(0, 8)}`),
          address: addr,
          city: 'Charlotte',
          state: 'NC',
          zip: '',
          county: 'Mecklenburg',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'lis_pendens',
          sourceUrl: meckUrl,
          photos: [],
          description: `Mecklenburg County property record — ${addr}`,
          metadata: { filingType: 'Lis Pendens', source: 'Mecklenburg County NC' },
        });
      });
    } catch (meckErr) {
      const msg = meckErr instanceof Error ? meckErr.message : String(meckErr);
      errors.push(`NC Mecklenburg County: ${msg}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`NC Wake County Tax: ${msg}`);
  }

  return listings;
}

export async function fetchNorthCarolinaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [aoc, wake] = await Promise.all([
    scrapeNcCourtForeclosures(errors),
    scrapeWakeCountyTax(errors),
  ]);
  return {
    source: 'courthouse-northcarolina',
    listings: [...aoc, ...wake],
    errors,
    fetchedAt: new Date(),
  };
}

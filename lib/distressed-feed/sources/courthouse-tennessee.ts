/**
 * Tennessee Courthouse Scraper
 *
 * Sources:
 * 1. Shelby County (Memphis) — foreclosure auction sales posted by the
 *    Shelby County Trustee under T.C.A. §35-5-101 (deed of trust sales).
 *    https://www.shelbycountytn.gov/2020/Foreclosures
 *
 * 2. Davidson County (Nashville) Chancery Court — foreclosure and lis pendens
 *    filings. Metro Nashville is TN's largest real estate market.
 *    https://www.nashville.gov/government/courts/chancery-court
 *
 * All data is public record under Tennessee Public Records Act §10-7-503.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `tn-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Shelby County Trustee — Memphis foreclosure auction listings
async function scrapeShelbySales(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.shelbycountytn.gov/2020/Foreclosures';

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

      const col0    = $(cells[0]).text().trim();
      const address = $(cells[1]).text().trim() || col0;
      const dateStr = cells.length > 2 ? $(cells[2]).text().trim() : '';
      const amount  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('shelby-fc', `row-${i}-${address.slice(0, 8)}`),
        address,
        city: 'Memphis',
        state: 'TN',
        zip: '',
        county: 'Shelby',
        propertyType: 'single_family',
        listPrice: parseFloat(amount.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'pre_foreclosure',
        auctionDate: dateStr ? new Date(dateStr) : undefined,
        sourceUrl: url,
        photos: [],
        description: [address, dateStr, amount].filter(Boolean).join(' | ').slice(0, 300),
        metadata: { filingType: 'Deed of Trust Sale', source: 'Shelby County Trustee TN', saleDate: dateStr },
      });
    });

    // Card fallback
    if (listings.length === 0) {
      $('.foreclosure-item, .sale-item, article, .item').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        listings.push({
          source: 'courthouse',
          sourceId: stableId('shelby-fc', `card-${i}`),
          address: lines[0] || 'Shelby County TN',
          city: 'Memphis',
          state: 'TN',
          zip: '',
          county: 'Shelby',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Foreclosure Sale', source: 'Shelby County Trustee TN (card)' },
        });
      });
    }

    // Downloadable lists
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;
      listings.push({
        source: 'courthouse',
        sourceId: stableId('shelby-fc', `file-${i}`),
        address: 'Shelby County Foreclosure List',
        city: 'Memphis',
        state: 'TN',
        zip: '',
        county: 'Shelby',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: href.startsWith('http') ? href : `https://www.shelbycountytn.gov${href}`,
        photos: [],
        description: `Shelby County foreclosure list: ${text}`,
        metadata: { filingType: 'Foreclosure List Download', source: 'Shelby County TN', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`TN Shelby County Foreclosures: ${msg}`);
  }

  return listings;
}

// Davidson County (Nashville) Chancery Court — lis pendens and foreclosures
async function scrapeDavidsonChancery(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.nashville.gov/government/courts/chancery-court';

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
        sourceId: stableId('davidson-cc', caseNo || `row-${i}`),
        address,
        city: 'Nashville',
        state: 'TN',
        zip: '',
        county: 'Davidson',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'lis_pendens',
        sourceUrl: url,
        photos: [],
        description: `Case: ${caseNo} | Filed: ${dateStr}`,
        metadata: { filingType: 'Lis Pendens', source: 'Davidson County Chancery Court TN', caseNo, filingDate: dateStr },
      });
    });

    // Generic paragraph fallback — chancery courts often post case summaries
    if (listings.length === 0) {
      $('p, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length < 15 || text.length > 500) return;
        if (!text.match(/\d{3,5}\s+\w/)) return;

        listings.push({
          source: 'courthouse',
          sourceId: stableId('davidson-cc', `para-${i}`),
          address: text.slice(0, 120),
          city: 'Nashville',
          state: 'TN',
          zip: '',
          county: 'Davidson',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'lis_pendens',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Chancery Filing', source: 'Davidson County Chancery Court TN (fallback)' },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`TN Davidson County Chancery: ${msg}`);
  }

  return listings;
}

export async function fetchTennesseeCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [shelby, davidson] = await Promise.all([
    scrapeShelbySales(errors),
    scrapeDavidsonChancery(errors),
  ]);
  return {
    source: 'courthouse-tennessee',
    listings: [...shelby, ...davidson],
    errors,
    fetchedAt: new Date(),
  };
}

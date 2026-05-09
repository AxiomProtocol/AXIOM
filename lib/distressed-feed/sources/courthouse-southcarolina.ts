/**
 * South Carolina Courthouse Scraper
 *
 * Sources:
 * 1. Richland County (Columbia) Delinquent Tax Sale — properties auctioned
 *    annually for unpaid ad valorem taxes under SC Code §12-51-40.
 *    https://www.richlandonline.com/Residents/Tax-Assessor/Delinquent-Tax-Sale
 *
 * 2. Charleston County Master-in-Equity — foreclosure judicial sales.
 *    SC uses a judicial foreclosure process; the Master-in-Equity court
 *    presides over all foreclosure sales (SC Code §29-3-630).
 *    https://www.charlestoncounty.org/departments/master-in-equity/
 *
 * All data is public record under South Carolina FOIA §30-4-10.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `sc-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Richland County Delinquent Tax Sale — Columbia SC
async function scrapeRichlandDelinquentTax(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.richlandonline.com/Residents/Tax-Assessor/Delinquent-Tax-Sale';

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

      const parcel  = $(cells[0]).text().trim();
      const address = $(cells[1]).text().trim();
      const owner   = cells.length > 2 ? $(cells[2]).text().trim() : '';
      const amount  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('richland-tax', parcel || `row-${i}`),
        address,
        city: 'Columbia',
        state: 'SC',
        zip: '',
        county: 'Richland',
        propertyType: 'single_family',
        listPrice: parseFloat(amount.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'tax_lien',
        sourceUrl: url,
        photos: [],
        description: `Parcel: ${parcel} | Owner: ${owner} | Delinquent: ${amount}`,
        metadata: { filingType: 'Delinquent Tax Sale', source: 'Richland County SC', parcelId: parcel, owner },
      });
    });

    // Card / list fallback
    if (listings.length === 0) {
      $('.property, .tax-item, .listing, article').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        listings.push({
          source: 'courthouse',
          sourceId: stableId('richland-tax', `card-${i}`),
          address: lines[0] || 'Richland County SC',
          city: 'Columbia',
          state: 'SC',
          zip: '',
          county: 'Richland',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'tax_lien',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Delinquent Tax Sale', source: 'Richland County SC (card)' },
        });
      });
    }

    // File download links
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;
      listings.push({
        source: 'courthouse',
        sourceId: stableId('richland-tax', `file-${i}`),
        address: 'Richland County Delinquent Tax List',
        city: 'Columbia',
        state: 'SC',
        zip: '',
        county: 'Richland',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'tax_lien',
        sourceUrl: href.startsWith('http') ? href : `https://www.richlandonline.com${href}`,
        photos: [],
        description: `Delinquent tax list: ${text}`,
        metadata: { filingType: 'Tax Sale List Download', source: 'Richland County SC', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`SC Richland County Tax Sale: ${msg}`);
  }

  return listings;
}

// Charleston County Master-in-Equity — judicial foreclosure sales
async function scrapeCharlestonMasterInEquity(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  const url = 'https://www.charlestoncounty.org/departments/master-in-equity/';

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
      const amount  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!address || address.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('charleston-mie', caseNo || `row-${i}`),
        address,
        city: 'Charleston',
        state: 'SC',
        zip: '',
        county: 'Charleston',
        propertyType: 'single_family',
        listPrice: parseFloat(amount.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'pre_foreclosure',
        auctionDate: dateStr ? new Date(dateStr) : undefined,
        sourceUrl: url,
        photos: [],
        description: `Case: ${caseNo} | Sale: ${dateStr} | Judgment: ${amount}`,
        metadata: { filingType: 'Judicial Foreclosure Sale', source: 'Charleston County Master-in-Equity SC', caseNo, saleDate: dateStr },
      });
    });

    // Card fallback
    if (listings.length === 0) {
      $('.case-item, .sale-item, article, .item').each((i, card) => {
        const text = $(card).text().trim();
        if (text.length < 10) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        listings.push({
          source: 'courthouse',
          sourceId: stableId('charleston-mie', `card-${i}`),
          address: lines[0] || 'Charleston County SC',
          city: 'Charleston',
          state: 'SC',
          zip: '',
          county: 'Charleston',
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: url,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Foreclosure Sale', source: 'Charleston County Master-in-Equity SC (card)' },
        });
      });
    }

    // Downloadable sale lists
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;
      listings.push({
        source: 'courthouse',
        sourceId: stableId('charleston-mie', `file-${i}`),
        address: 'Charleston County Foreclosure Sale List',
        city: 'Charleston',
        state: 'SC',
        zip: '',
        county: 'Charleston',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: href.startsWith('http') ? href : `https://www.charlestoncounty.org${href}`,
        photos: [],
        description: `Charleston foreclosure sale list: ${text}`,
        metadata: { filingType: 'Foreclosure Sale List Download', source: 'Charleston County Master-in-Equity SC', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`SC Charleston Master-in-Equity: ${msg}`);
  }

  return listings;
}

export async function fetchSouthCarolinaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [richland, charleston] = await Promise.all([
    scrapeRichlandDelinquentTax(errors),
    scrapeCharlestonMasterInEquity(errors),
  ]);
  return {
    source: 'courthouse-southcarolina',
    listings: [...richland, ...charleston],
    errors,
    fetchedAt: new Date(),
  };
}

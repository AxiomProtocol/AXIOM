/**
 * Texas Courthouse Scraper — 5 Major Metros
 *
 * Texas is a non-judicial foreclosure state. Trustee sales occur on the first
 * Tuesday of each month at county courthouses. Notices are filed with the
 * county clerk 21+ days before sale.
 *
 * Sources (all official government portals, public record):
 * - Harris County (Houston):   harriscountyfcl.com  + cclerk.hctx.net
 * - Dallas County:             dallascounty.org / deed search
 * - Tarrant County (Ft Worth): tarrantcountytx.gov
 * - Travis County (Austin):    deed.traviscountytx.gov
 * - Bexar County (San Antonio):bexar.org
 *
 * Texas Property Code § 51.002 mandates posting of trustee sale notices
 * at the courthouse and filing with the county clerk — fully public record.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1500;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface TxCounty {
  name: string;
  city: string;
  fclUrl: string;      // Foreclosure listing / clerk URL
  backupUrl?: string;
}

const TX_COUNTIES: TxCounty[] = [
  {
    name: 'Harris',
    city: 'Houston',
    fclUrl: 'https://www.harriscountyfcl.com/Default.aspx',
    backupUrl: 'https://www.cclerk.hctx.net/Applications/WebSearch/SO.aspx',
  },
  {
    name: 'Dallas',
    city: 'Dallas',
    fclUrl: 'https://www.dallascounty.org/departments/clerk/property.php',
    backupUrl: 'https://deed.dallascounty.org/search',
  },
  {
    name: 'Tarrant',
    city: 'Fort Worth',
    fclUrl: 'https://apps.tarrantcountytx.gov/county-clerk/real-property/',
    backupUrl: 'https://www.tarrantcountytx.gov/en/county-clerk/real-property-records.html',
  },
  {
    name: 'Travis',
    city: 'Austin',
    fclUrl: 'https://deed.traviscountytx.gov/pages/documentSearch',
    backupUrl: 'https://www.traviscountytx.gov/county-clerk/deed-records',
  },
  {
    name: 'Bexar',
    city: 'San Antonio',
    fclUrl: 'https://www.bexar.org/549/Real-Property',
    backupUrl: 'https://bexar.org/549/Real-Property',
  },
];

function stableId(county: string, ref: string) {
  return `tx-${county.toLowerCase()}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Harris County has the most accessible public site — dedicated FCL portal
async function scrapeHarris(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    const response = await axios.get('https://www.harriscountyfcl.com/Default.aspx', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    // Harris FCL site has a table of current month's foreclosure sales
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const causeNo   = $(cells[0]).text().trim();
      const address   = $(cells[1]).text().trim();
      const legalDesc = $(cells[2]).text().trim();
      const saleDateRaw = $(cells[3]).text().trim();

      if (!address || address.length < 5) return;

      // Parse sale date
      let auctionDate: Date | undefined;
      const dateMatch = saleDateRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const d = new Date(`${dateMatch[3]}-${dateMatch[1].padStart(2,'0')}-${dateMatch[2].padStart(2,'0')}`);
        if (!isNaN(d.getTime())) auctionDate = d;
      }

      // Extract zip from address if present
      const zipMatch = address.match(/,\s*TX\s+(\d{5})/i) || address.match(/(\d{5})$/);
      const zip = zipMatch ? zipMatch[1] : '';

      listings.push({
        source: 'courthouse',
        sourceId: stableId('harris', causeNo || `row-${i}`),
        address: address.replace(/,\s*Houston.*$/i, '').trim(),
        city: 'Houston',
        state: 'TX',
        zip,
        county: 'Harris',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'foreclosure',
        sourceUrl: 'https://www.harriscountyfcl.com/Default.aspx',
        photos: [],
        description: legalDesc ? `Cause No: ${causeNo} — ${legalDesc}` : `Cause No: ${causeNo}`,
        auctionDate,
        metadata: {
          filingType: 'Trustee Sale Notice',
          source: 'Harris County FCL',
          causeNo,
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`TX Harris County FCL: ${msg}`);
  }
  return listings;
}

// Generic county scraper for Dallas, Tarrant, Travis, Bexar
async function scrapeCountyClerk(county: TxCounty, errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    await sleep(DELAY);
    const response = await axios.get(county.fclUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data as string);

    // Look for deed/trustee sale notice data in tables
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const col0 = $(cells[0]).text().trim();
      const col1 = cells.length > 1 ? $(cells[1]).text().trim() : '';
      const col2 = cells.length > 2 ? $(cells[2]).text().trim() : '';

      if (col0.length < 5) return;

      // Heuristic: if a cell looks like an address (has a street number), use it
      const addressLike = [col0, col1, col2].find(c => /^\d+\s+\w/.test(c)) || col0;

      listings.push({
        source: 'courthouse',
        sourceId: stableId(county.name, `${col0}-${i}`),
        address: addressLike.slice(0, 120),
        city: county.city,
        state: 'TX',
        zip: '',
        county: county.name,
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'foreclosure',
        sourceUrl: county.fclUrl,
        photos: [],
        description: [col0, col1, col2].filter(Boolean).join(' | ').slice(0, 400),
        metadata: {
          filingType: 'Trustee Sale Notice',
          source: `${county.name} County Clerk TX`,
        },
      });
    });

    // Also scan for any obvious address-containing list items
    if (listings.length === 0) {
      $('li, p').each((i, el) => {
        const text = $(el).text().trim();
        if (!/^\d+\s+\w/.test(text) || text.length < 10 || text.length > 300) return;
        listings.push({
          source: 'courthouse',
          sourceId: stableId(county.name, `li-${i}`),
          address: text.slice(0, 120),
          city: county.city,
          state: 'TX',
          zip: '',
          county: county.name,
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'foreclosure',
          sourceUrl: county.fclUrl,
          photos: [],
          description: text.slice(0, 300),
          metadata: { filingType: 'Trustee Sale Notice', source: `${county.name} County TX (list item)` },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`TX ${county.name} County: ${msg}`);
  }
  return listings;
}

export async function fetchTexasCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const all: NormalizedListing[] = [];

  // Harris first (dedicated FCL portal)
  const harris = await scrapeHarris(errors);
  all.push(...harris);

  // Remaining 4 counties
  for (const county of TX_COUNTIES.filter(c => c.name !== 'Harris')) {
    const results = await scrapeCountyClerk(county, errors);
    all.push(...results);
    await sleep(DELAY);
  }

  return { source: 'courthouse-texas', listings: all, errors, fetchedAt: new Date() };
}

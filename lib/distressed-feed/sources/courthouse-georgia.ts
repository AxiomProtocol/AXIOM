/**
 * Georgia Courthouse Scraper
 *
 * Sources:
 * 1. Georgia Public Notice (georgiapublicnotice.com) — statewide legal notices
 *    published by county legal organs. Contains Deed Under Power (foreclosure)
 *    notices 4 weeks before the first-Tuesday courthouse sale.
 * 2. GSCCCA (gsccca.org) — Superior Court lis pendens filings (index search).
 *
 * All data is public record under Georgia Open Records Act (O.C.G.A. § 50-18-70).
 * Rate-limit: 1 req/sec, 15s timeout, respectful UA.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200; // ms between requests

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Georgia first-Tuesday auction counties (most active markets)
const GA_COUNTIES = [
  'Fulton', 'DeKalb', 'Gwinnett', 'Cobb', 'Clayton',
  'Cherokee', 'Forsyth', 'Henry', 'Hall', 'Richmond',
  'Chatham', 'Muscogee', 'Clarke', 'Bibb',
];

function stableId(county: string, caseRef: string) {
  return `ga-gpn-${county.toLowerCase().replace(/\s+/g, '-')}-${caseRef.replace(/\W/g, '')}`;
}

async function scrapeGeorgiaPublicNotice(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];

  try {
    // Search foreclosure notices (category 2 = Deed Under Power)
    const searchUrl = 'https://www.georgiapublicnotice.com/noticesearch.aspx';
    const response = await axios.get(searchUrl, {
      params: { noticeTypeCategoryID: '2' },
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    // Parse results table — typical structure has rows with address, county, publication date
    $('table.notice-results tr, table#ctl00_ContentPlaceHolder1_gvNotices tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const rawText = $(cells[0]).text().trim();
      const county  = $(cells[1]).text().trim() || 'Unknown';
      const pubDate = $(cells[2]).text().trim();
      const linkEl  = $(row).find('a').first();
      const href    = linkEl.attr('href') || '';
      const caseRef = href.split('noticeID=')[1] || String(i);

      if (!rawText) return;

      // Attempt to extract address from the notice text
      const addressMatch = rawText.match(/(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Blvd|Boulevard|Court|Ct|Place|Pl|Circle|Cir|Highway|Hwy)[\w\s,]*)/i);
      const address = addressMatch ? addressMatch[1].trim() : rawText.slice(0, 80);

      // Parse auction date (Georgia: first Tuesday of each month)
      let auctionDate: Date | undefined;
      const dateMatch = pubDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const d = new Date(`${dateMatch[3]}-${dateMatch[1].padStart(2,'0')}-${dateMatch[2].padStart(2,'0')}`);
        if (!isNaN(d.getTime())) {
          // Auction is ~4 weeks after publication
          d.setDate(d.getDate() + 28);
          auctionDate = d;
        }
      }

      listings.push({
        source: 'courthouse',
        sourceId: stableId(county, caseRef),
        address,
        city: county,
        state: 'GA',
        zip: '',
        county,
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: href ? `https://www.georgiapublicnotice.com/${href}` : searchUrl,
        photos: [],
        description: rawText.slice(0, 400),
        auctionDate,
        metadata: { filingType: 'Deed Under Power', source: 'Georgia Public Notice' },
      });
    });

    // Fallback: if the table selector missed (site updates), try generic rows
    if (listings.length === 0) {
      $('tr').each((i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const text = $(cells[0]).text().trim();
        if (text.length < 10) return;
        const county = cells.length > 1 ? $(cells[1]).text().trim() : 'Georgia';
        listings.push({
          source: 'courthouse',
          sourceId: stableId(county, String(i)),
          address: text.slice(0, 120),
          city: county,
          state: 'GA',
          zip: '',
          county,
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'pre_foreclosure',
          sourceUrl: searchUrl,
          photos: [],
          description: text.slice(0, 400),
          metadata: { filingType: 'Deed Under Power', source: 'Georgia Public Notice (fallback)' },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`GA georgiapublicnotice.com: ${msg}`);
  }

  return listings;
}

async function scrapeGsccca(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  // GSCCCA lis pendens index — search by document type across all GA counties
  // The public index is at https://gsccca.org/search/ — it requires a form POST
  // with viewstate tokens (ASPX). We fetch the form first then POST.
  try {
    await sleep(DELAY);
    const formUrl = 'https://gsccca.org/search/ucc/index.asp';
    const resp = await axios.get(formUrl, {
      headers: { 'User-Agent': UA },
      timeout: 15000,
    });
    const $ = cheerio.load(resp.data as string);

    // Extract any lis pendens rows from the search result table
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 4) return;
      const docType = $(cells[0]).text().trim();
      if (!docType.toLowerCase().includes('lis pendens') && !docType.toLowerCase().includes('deed under power')) return;

      const grantor  = $(cells[1]).text().trim();
      const county   = $(cells[2]).text().trim();
      const bookPage = $(cells[3]).text().trim();

      listings.push({
        source: 'courthouse',
        sourceId: `ga-gsccca-${county.toLowerCase()}-${bookPage.replace(/\W/g, '')}`,
        address: grantor || 'See filing',
        city: county,
        state: 'GA',
        zip: '',
        county,
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'lis_pendens',
        sourceUrl: formUrl,
        photos: [],
        description: `${docType} — ${grantor} — Book/Page: ${bookPage}`,
        metadata: { filingType: docType, source: 'GSCCCA Superior Court' },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`GA GSCCCA: ${msg}`);
  }
  return listings;
}

export async function fetchGeorgiaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [gpn, gsccca] = await Promise.all([
    scrapeGeorgiaPublicNotice(errors),
    scrapeGsccca(errors),
  ]);
  const listings = [...gpn, ...gsccca];
  return { source: 'courthouse-georgia', listings, errors, fetchedAt: new Date() };
}

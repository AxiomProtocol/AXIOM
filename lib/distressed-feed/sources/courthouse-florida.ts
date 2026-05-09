/**
 * Florida Courthouse Scraper
 *
 * Sources (county clerk portals — public record under Florida Statute § 28):
 * - Hillsborough County (Tampa): pubrec.hillsclerk.com
 * - Orange County (Orlando): oclandrecords.occompt.com
 * - Duval County (Jacksonville): officialrecords.duvalclerk.com
 * - Miami-Dade County: www2.miami-dadeclerk.com
 * - Palm Beach County: lrs.co.palm-beach.fl.us
 * - Broward County: officialrecords.broward.org
 *
 * Florida lis pendens are electronically recorded and publicly searchable.
 * Each county clerk maintains an official records search.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1500;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface FloridaCounty {
  name: string;
  city: string;
  searchUrl: string;
  postData?: Record<string, string>;
  docTypeParam?: string;
}

const FL_COUNTIES: FloridaCounty[] = [
  {
    name: 'Hillsborough',
    city: 'Tampa',
    searchUrl: 'https://pubrec.hillsclerk.com/oncoredisplay/search.aspx',
    docTypeParam: 'LP', // Lis Pendens
  },
  {
    name: 'Orange',
    city: 'Orlando',
    searchUrl: 'https://oclandrecords.occompt.com/Search/SearchOfficialRecords',
    docTypeParam: 'LISPENDENS',
  },
  {
    name: 'Duval',
    city: 'Jacksonville',
    searchUrl: 'https://officialrecords.duvalclerk.com/oncoredisplay/search.aspx',
    docTypeParam: 'LP',
  },
  {
    name: 'Miami-Dade',
    city: 'Miami',
    searchUrl: 'https://www2.miami-dadeclerk.com/officialrecords/StandardSearch.aspx',
    docTypeParam: 'LP',
  },
  {
    name: 'Palm Beach',
    city: 'West Palm Beach',
    searchUrl: 'https://lrs.co.palm-beach.fl.us/lrs/officialRecordsSearch.do',
    docTypeParam: 'LIS PENDENS',
  },
  {
    name: 'Broward',
    city: 'Fort Lauderdale',
    searchUrl: 'https://officialrecords.broward.org/oncoredisplay/search.aspx',
    docTypeParam: 'LP',
  },
];

function stableId(county: string, bookPage: string) {
  return `fl-${county.toLowerCase().replace(/\s+/g, '-')}-${bookPage.replace(/\W/g, '').slice(0, 20)}`;
}

async function scrapeCounty(county: FloridaCounty, errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    await sleep(DELAY);

    // Most FL county clerk portals share the Fidlar/OnCore platform
    // We request recent lis pendens filings by document type
    const params: Record<string, string> = {
      searchOpt: 'opn',
      docType: county.docTypeParam || 'LP',
      dateFrom: (() => {
        const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
      })(),
      dateTo: new Date().toISOString().slice(0, 10),
    };

    const response = await axios.get(county.searchUrl, {
      params,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        Referer: county.searchUrl,
      },
      timeout: 15000,
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data as string);

    // OnCore / Fidlar standard result grid
    $('table.searchresults tr, table#gvResults tr, #SearchResultsGrid tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const docDate  = $(cells[0]).text().trim();
      const grantor  = $(cells[1]).text().trim();
      const grantee  = $(cells[2]).text().trim();
      const bookPage = cells.length > 3 ? $(cells[3]).text().trim() : String(i);
      const docType  = cells.length > 4 ? $(cells[4]).text().trim() : 'LP';

      if (!grantor && !grantee) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId(county.name, bookPage || `${docDate}-${i}`),
        address: grantor || 'See filing',
        city: county.city,
        state: 'FL',
        zip: '',
        county: county.name,
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'lis_pendens',
        sourceUrl: county.searchUrl,
        photos: [],
        description: `${docType} — Grantor: ${grantor} / Grantee: ${grantee} — Filed: ${docDate}`,
        metadata: {
          filingType: docType,
          source: `${county.name} County Clerk`,
          caseNo: bookPage,
          filedDate: docDate,
        },
      });
    });

    // Generic fallback parser for non-OnCore portals
    if (listings.length === 0) {
      $('tr').each((i, row) => {
        if (i === 0) return;
        const text = $(row).text().trim();
        if (text.length < 10) return;
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const col0 = $(cells[0]).text().trim();
        listings.push({
          source: 'courthouse',
          sourceId: stableId(county.name, `fallback-${i}`),
          address: col0 || text.slice(0, 80),
          city: county.city,
          state: 'FL',
          zip: '',
          county: county.name,
          propertyType: 'single_family',
          listPrice: 0,
          distressType: 'lis_pendens',
          sourceUrl: county.searchUrl,
          photos: [],
          description: text.slice(0, 300),
          metadata: { filingType: 'Lis Pendens', source: `${county.name} County Clerk (fallback)` },
        });
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`FL ${county.name}: ${msg}`);
  }
  return listings;
}

export async function fetchFloridaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const all: NormalizedListing[] = [];

  // Scrape counties in series to respect rate limits
  for (const county of FL_COUNTIES) {
    const results = await scrapeCounty(county, errors);
    all.push(...results);
    await sleep(DELAY);
  }

  return { source: 'courthouse-florida', listings: all, errors, fetchedAt: new Date() };
}

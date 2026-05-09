/**
 * Arizona Courthouse Scraper — Maricopa County
 *
 * Arizona is a Trustee Sale (non-judicial foreclosure) state.
 * Maricopa County is one of the highest-volume foreclosure markets in the US.
 *
 * Sources:
 * - Maricopa County Recorder: recorder.maricopa.gov — public deed records,
 *   Notice of Trustee Sale (NTS) filings, Notice of Default (NOD)
 * - Maricopa County Sheriff Sales: mcso.maricopa.gov
 *
 * Arizona Revised Statutes § 33-807 requires NTS filings with county recorder
 * at least 91 days before sale — fully public record.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(ref: string) {
  return `az-maricopa-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

async function scrapeMaricopaRecorder(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    // Maricopa Recorder public search — document type: NTS (Notice of Trustee Sale)
    const searchUrl = 'https://recorder.maricopa.gov/recdocdata/GetDocQuery.aspx';
    const dateFrom = (() => {
      const d = new Date(); d.setDate(d.getDate() - 30);
      return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
    })();
    const dateTo = (() => {
      const d = new Date();
      return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
    })();

    const response = await axios.get(searchUrl, {
      params: {
        dType: 'NTS',
        bDate: dateFrom,
        eDate: dateTo,
        OwnerName: '',
        SplitCode: '',
      },
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    $('table tr, #tblResults tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const recordDate = $(cells[0]).text().trim();
      const grantor    = $(cells[1]).text().trim();
      const docNum     = $(cells[2]).text().trim();
      const legalDesc  = cells.length > 3 ? $(cells[3]).text().trim() : '';

      if (!grantor && !docNum) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId(docNum || `${recordDate}-${i}`),
        address: grantor || legalDesc.slice(0, 100) || 'See filing',
        city: 'Phoenix',
        state: 'AZ',
        zip: '',
        county: 'Maricopa',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'pre_foreclosure',
        sourceUrl: searchUrl,
        photos: [],
        description: `NTS — ${grantor} — Doc#: ${docNum} — Recorded: ${recordDate}${legalDesc ? ' — ' + legalDesc : ''}`,
        metadata: {
          filingType: 'Notice of Trustee Sale',
          source: 'Maricopa County Recorder',
          caseNo: docNum,
          recordDate,
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AZ Maricopa Recorder: ${msg}`);
  }
  return listings;
}

async function scrapeMaricopaSheriff(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    await sleep(DELAY);
    // Maricopa County Sheriff civil sales list
    const url = 'https://www.mcso.maricopa.gov/Sections/Civil/CivilSales.aspx';
    const response = await axios.get(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const causeNo = $(cells[0]).text().trim();
      const address = cells.length > 1 ? $(cells[1]).text().trim() : '';
      const saleDateRaw = cells.length > 2 ? $(cells[2]).text().trim() : '';

      if (!address || address.length < 5) return;

      let auctionDate: Date | undefined;
      const m = saleDateRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (m) {
        const d = new Date(`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`);
        if (!isNaN(d.getTime())) auctionDate = d;
      }

      listings.push({
        source: 'courthouse',
        sourceId: stableId(`mcso-${causeNo || i}`),
        address,
        city: 'Phoenix',
        state: 'AZ',
        zip: '',
        county: 'Maricopa',
        propertyType: 'single_family',
        listPrice: 0,
        distressType: 'foreclosure',
        sourceUrl: url,
        photos: [],
        description: `Civil Sale — Cause: ${causeNo} — Date: ${saleDateRaw}`,
        auctionDate,
        metadata: {
          filingType: 'Sheriff Civil Sale',
          source: 'Maricopa County Sheriff',
          caseNo: causeNo,
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AZ Maricopa Sheriff: ${msg}`);
  }
  return listings;
}

export async function fetchArizonaCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [recorder, sheriff] = await Promise.all([
    scrapeMaricopaRecorder(errors),
    scrapeMaricopaSheriff(errors),
  ]);
  return {
    source: 'courthouse-arizona',
    listings: [...recorder, ...sheriff],
    errors,
    fetchedAt: new Date(),
  };
}

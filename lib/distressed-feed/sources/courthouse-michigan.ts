/**
 * Michigan Courthouse Scraper — Wayne County / Detroit Land Bank
 *
 * Sources:
 * 1. Detroit Land Bank Authority (buildingdetroit.org) — city-owned tax-forfeited
 *    properties available for acquisition. DLBA runs the largest urban land bank
 *    in the US. Their available properties feed is publicly accessible.
 *
 * 2. Wayne County Treasurer Tax Foreclosure (waynecounty.com) — annual tax
 *    foreclosure auction. Michigan's tax foreclosure process (General Property
 *    Tax Act MCL 211.78) results in county ownership after 3 years of delinquency.
 *
 * 3. Oakland County & Macomb County adjacent market supplemental sources.
 *
 * All data is public record under Michigan Freedom of Information Act (FOIA).
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NormalizedListing, SourceResult } from '../types';

const UA = 'AxiomProtocolDataService/1.0 (data@axiomprotocol.io; public-records-research)';
const DELAY = 1200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function stableId(prefix: string, ref: string) {
  return `mi-${prefix}-${ref.replace(/\W/g, '').slice(0, 24)}`;
}

// Detroit Land Bank Authority — available properties
async function scrapeDetroitLandBank(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    // DLBA has a public property search — try the available properties endpoint
    const apiUrl = 'https://buildingdetroit.org/available-properties/';
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json' },
      timeout: 15000,
    });

    // Check if the response is JSON (they have an API)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const data = response.data as { properties?: Array<Record<string, unknown>> };
      if (Array.isArray(data?.properties)) {
        for (const prop of data.properties) {
          const address = String(prop.address || prop.street_address || '');
          const price   = parseFloat(String(prop.price || prop.asking_price || '0')) || 0;
          const propId  = String(prop.id || prop.parcel_id || '');
          if (!address) continue;

          listings.push({
            source: 'courthouse',
            sourceId: stableId('dlba', propId || address),
            address,
            city: 'Detroit',
            state: 'MI',
            zip: String(prop.zip || prop.postal_code || ''),
            county: 'Wayne',
            propertyType: String(prop.property_type || 'single_family'),
            bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
            sqft: prop.sqft ? Number(prop.sqft) : undefined,
            yearBuilt: prop.year_built ? Number(prop.year_built) : undefined,
            listPrice: price,
            distressType: 'tax_lien',
            sourceUrl: prop.url ? String(prop.url) : apiUrl,
            photos: Array.isArray(prop.photos) ? prop.photos as string[] : [],
            description: String(prop.description || ''),
            metadata: {
              filingType: 'Tax Forfeiture',
              source: 'Detroit Land Bank Authority',
              parcelId: propId,
            },
          });
        }
      }
    } else {
      // HTML fallback — parse property cards
      const $ = cheerio.load(response.data as string);

      // DLBA typically renders property cards with address, price, parcel ID
      $('.property-card, .listing-card, article.property, .available-property').each((i, card) => {
        const addressEl = $(card).find('.address, h2, h3, .property-address').first();
        const priceEl   = $(card).find('.price, .asking-price, .list-price').first();
        const parcelEl  = $(card).find('.parcel, .parcel-id, .property-id').first();
        const linkEl    = $(card).find('a').first();

        const address = addressEl.text().trim();
        const priceRaw = priceEl.text().trim().replace(/[^0-9.]/g, '');
        const parcelId = parcelEl.text().trim();
        const url = linkEl.attr('href') || apiUrl;

        if (!address || address.length < 5) return;

        listings.push({
          source: 'courthouse',
          sourceId: stableId('dlba', parcelId || `card-${i}`),
          address,
          city: 'Detroit',
          state: 'MI',
          zip: '',
          county: 'Wayne',
          propertyType: 'single_family',
          listPrice: priceRaw ? parseFloat(priceRaw) : 0,
          distressType: 'tax_lien',
          sourceUrl: url.startsWith('http') ? url : `https://buildingdetroit.org${url}`,
          photos: [],
          description: $(card).text().trim().slice(0, 300),
          metadata: {
            filingType: 'Tax Forfeiture',
            source: 'Detroit Land Bank Authority',
            parcelId,
          },
        });
      });

      // Generic table fallback
      if (listings.length === 0) {
        $('table tr').each((i, row) => {
          if (i === 0) return;
          const cells = $(row).find('td');
          if (cells.length < 2) return;
          const col0 = $(cells[0]).text().trim();
          const col1 = $(cells[1]).text().trim();
          if (!col0 || col0.length < 5) return;

          listings.push({
            source: 'courthouse',
            sourceId: stableId('dlba', `row-${i}`),
            address: col0,
            city: 'Detroit',
            state: 'MI',
            zip: '',
            county: 'Wayne',
            propertyType: 'single_family',
            listPrice: parseFloat(col1.replace(/[^0-9.]/g, '')) || 0,
            distressType: 'tax_lien',
            sourceUrl: apiUrl,
            photos: [],
            description: [col0, col1].join(' | ').slice(0, 300),
            metadata: { filingType: 'Tax Forfeiture', source: 'Detroit Land Bank (table fallback)' },
          });
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`MI Detroit Land Bank: ${msg}`);
  }
  return listings;
}

// Wayne County Treasurer — annual tax foreclosure list
async function scrapeWayneCountyTax(errors: string[]): Promise<NormalizedListing[]> {
  const listings: NormalizedListing[] = [];
  try {
    await sleep(DELAY);
    // Wayne County Treasurer posts the forfeiture list publicly
    const url = 'https://www.waynecounty.com/elected/treasurer/tax-foreclosure-auctions.aspx';
    const response = await axios.get(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data as string);

    // Look for auction information / property list links
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const col0 = $(cells[0]).text().trim();
      const col1 = $(cells[1]).text().trim();
      if (!col0 || col0.length < 5) return;

      listings.push({
        source: 'courthouse',
        sourceId: stableId('wayne-tax', `row-${i}-${col0.slice(0,8)}`),
        address: col0,
        city: 'Detroit',
        state: 'MI',
        zip: '',
        county: 'Wayne',
        propertyType: 'single_family',
        listPrice: parseFloat(col1.replace(/[^0-9.]/g, '')) || 0,
        distressType: 'tax_lien',
        sourceUrl: url,
        photos: [],
        description: [col0, col1].join(' | ').slice(0, 300),
        metadata: { filingType: 'Tax Foreclosure Auction', source: 'Wayne County Treasurer MI' },
      });
    });

    // Also extract any downloadable list links for future PDF parsing
    $('a[href*=".pdf"], a[href*=".xlsx"], a[href*=".csv"]').each((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      if (!href) return;
      // Note these as metadata for manual download / future automation
      listings.push({
        source: 'courthouse',
        sourceId: stableId('wayne-tax', `file-${i}`),
        address: 'Wayne County Tax Foreclosure List',
        city: 'Detroit',
        state: 'MI',
        zip: '',
        county: 'Wayne',
        propertyType: 'multi_family',
        listPrice: 0,
        distressType: 'tax_lien',
        sourceUrl: href.startsWith('http') ? href : `https://www.waynecounty.com${href}`,
        photos: [],
        description: `Downloadable list: ${text}`,
        metadata: { filingType: 'Tax Foreclosure List Download', source: 'Wayne County Treasurer MI', listUrl: href },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`MI Wayne County Treasurer: ${msg}`);
  }
  return listings;
}

export async function fetchMichiganCourthouseListings(): Promise<SourceResult> {
  const errors: string[] = [];
  const [dlba, wayne] = await Promise.all([
    scrapeDetroitLandBank(errors),
    scrapeWayneCountyTax(errors),
  ]);
  return {
    source: 'courthouse-michigan',
    listings: [...dlba, ...wayne],
    errors,
    fetchedAt: new Date(),
  };
}

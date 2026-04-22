import type { NextApiRequest, NextApiResponse } from 'next';
import { searchListings, isRepliersConfigured } from '../../../lib/re/repliers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRepliersConfigured()) {
    return res.json({
      listings: [],
      isTestMode: true,
      configured: false,
      message: 'Repliers API key not configured',
    });
  }

  const {
    city,
    state,
    zip,
    min_price,
    max_price,
    min_beds,
    page = '1',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);

  const result = await searchListings({
    city: city ? String(city) : undefined,
    state: state ? String(state) : undefined,
    zip: zip ? String(zip) : undefined,
    lastStatus: ['Pc', 'Exp'],
    daysOnMarketMin: 60,
    minPrice: min_price ? parseInt(String(min_price), 10) : undefined,
    maxPrice: max_price ? parseInt(String(max_price), 10) : undefined,
    minBeds: min_beds ? parseInt(String(min_beds), 10) : undefined,
    resultsPerPage: 20,
    pageNum,
  });

  if (!result.data) {
    return res.json({
      listings: [],
      isTestMode: result.isTestMode,
      configured: true,
      pagination: { page: pageNum, total: 0, totalPages: 0 },
    });
  }

  const raw = result.data.listings || [];

  const listings = raw.map((l) => {
    const addr = l.address || {};
    const fullAddress = [addr.streetNumber, addr.streetName, addr.streetSuffix]
      .filter(Boolean)
      .join(' ');

    const sqftRaw = l.details?.sqft;
    const sqft = sqftRaw ? parseInt(sqftRaw.replace(/[^0-9]/g, ''), 10) || null : null;

    const lastStatusLabel: Record<string, string> = {
      Pc: 'Price Changed',
      Exp: 'Expired',
      Sus: 'Suspended',
      Ter: 'Terminated',
    };

    return {
      mlsNumber: l.mlsNumber,
      address: fullAddress || 'Address unavailable',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      propertyType: l.details?.propertyType || 'Residential',
      bedrooms: l.details?.numBedrooms ?? null,
      bathrooms: l.details?.numBathrooms ?? null,
      sqft,
      yearBuilt: l.details?.yearBuilt ? parseInt(l.details.yearBuilt, 10) : null,
      listPrice: l.listPrice || 0,
      daysOnMarket: l.daysOnMarket ?? null,
      status: l.status || '',
      lastStatus: l.lastStatus || '',
      lastStatusLabel: lastStatusLabel[l.lastStatus || ''] || l.lastStatus || '',
      listDate: l.listDate || null,
      latitude: l.map?.latitude ?? null,
      longitude: l.map?.longitude ?? null,
      images: l.images || [],
      description: l.details?.description || null,
      addressKey: l.addressKey || null,
      sourceUrl: l.mlsNumber
        ? `/property/${encodeURIComponent(l.mlsNumber)}`
        : null,
    };
  });

  return res.json({
    listings,
    isTestMode: result.isTestMode,
    configured: true,
    pagination: {
      page: pageNum,
      total: result.data.count || listings.length,
      totalPages: result.data.numPages || 1,
    },
  });
}

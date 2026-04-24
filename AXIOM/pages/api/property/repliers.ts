import type { NextApiRequest, NextApiResponse } from 'next';
import { getEstimate, getSalesComps, isRepliersConfigured } from '../../../lib/re/repliers';

function parseAddressParts(address: string): {
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  city?: string;
  state?: string;
  zip?: string;
} {
  const trimmed = address.trim();
  const parts = trimmed.split(',').map(p => p.trim());

  if (parts.length < 2) return {};

  const street = parts[0] || '';
  const cityPart = parts[1] || '';
  const stateZipPart = parts[2] || '';

  const streetMatch = street.match(/^(\d+)\s+(.+?)(?:\s+(St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Fwy|Loop|Trail|Tr|Path|Ter|Terr|Terrace|Point|Pt|Run|Ridge|Glen|Pass|Crescent|Cres|Place|Court|Lane|Road|Boulevard|Avenue|Street|Drive)\.?)?$/i);

  let streetNumber: string | undefined;
  let streetName: string | undefined;
  let streetSuffix: string | undefined;

  if (streetMatch) {
    streetNumber = streetMatch[1];
    streetName = streetMatch[2];
    streetSuffix = streetMatch[3];
  } else {
    const numMatch = street.match(/^(\d+)\s+(.+)$/);
    if (numMatch) {
      streetNumber = numMatch[1];
      streetName = numMatch[2];
    }
  }

  const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5})/);
  const state = stateZipMatch?.[1];
  const zip = stateZipMatch?.[2];

  return { streetNumber, streetName, streetSuffix, city: cityPart, state, zip };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRepliersConfigured()) {
    return res.json({
      avm: null,
      comps: [],
      isTestMode: true,
      configured: false,
    });
  }

  const { address, beds, baths, sqft, city, state, zip } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  const parsed = parseAddressParts(address);
  const resolvedCity = city || parsed.city;
  const resolvedState = state || parsed.state;
  const resolvedZip = zip || parsed.zip;

  const [avmResult, compsResult] = await Promise.all([
    getEstimate({
      city: resolvedCity,
      streetName: parsed.streetName,
      streetNumber: parsed.streetNumber,
      streetSuffix: parsed.streetSuffix,
      zip: resolvedZip,
      state: resolvedState,
      beds: beds ? parseInt(beds, 10) : undefined,
      baths: baths ? parseFloat(baths) : undefined,
      sqft: sqft ? parseInt(sqft, 10) : undefined,
    }),
    getSalesComps({
      city: resolvedCity,
      state: resolvedState,
      zip: resolvedZip,
      minBeds: beds ? Math.max(1, parseInt(beds, 10) - 1) : undefined,
      resultsPerPage: 8,
    }),
  ]);

  const isTestMode = avmResult.isTestMode;

  const avm = avmResult.data
    ? {
        price: avmResult.data.price ?? null,
        priceMin: avmResult.data.priceMin ?? null,
        priceMax: avmResult.data.priceMax ?? null,
        confidence: avmResult.data.confidence ?? null,
      }
    : null;

  const rawComps = compsResult.data?.listings || [];
  const comps = rawComps.map((l) => {
    const addr = l.address || {};
    const sqftRaw = l.details?.sqft;
    const sqftNum = sqftRaw ? parseInt(sqftRaw.replace(/[^0-9]/g, ''), 10) || null : null;
    const price = l.soldPrice || l.listPrice || 0;
    const pricePerSqft = price && sqftNum ? Math.round(price / sqftNum) : null;

    return {
      mlsNumber: l.mlsNumber || null,
      address: [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' '),
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      listPrice: l.listPrice || null,
      soldPrice: l.soldPrice || null,
      beds: l.details?.numBedrooms ?? null,
      baths: l.details?.numBathrooms ?? null,
      sqft: sqftNum,
      pricePerSqft,
      daysOnMarket: l.daysOnMarket ?? null,
      soldDate: l.soldDate || null,
      status: l.status || null,
    };
  });

  return res.json({
    avm,
    comps,
    isTestMode,
    configured: true,
  });
}

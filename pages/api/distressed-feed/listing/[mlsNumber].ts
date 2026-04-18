import type { NextApiRequest, NextApiResponse } from 'next';
import { getListingByMlsNumber, buildRepliersImageUrl, isRepliersConfigured } from '../../../../lib/re/repliers';

const lastStatusLabel: Record<string, string> = {
  Sld: 'Sold',
  Exp: 'Expired',
  Ter: 'Terminated',
  Sus: 'Suspended',
  Pc: 'Price Change',
  New: 'New',
  Ext: 'Extended',
  Lsd: 'Leased',
};

function buildPropertyTypeLabel(l: any): string {
  const style = l?.details?.style?.trim();
  const ptype = l?.details?.propertyType?.trim();
  const cls = l?.class?.trim();
  const friendlyClass = cls ? cls.replace(/Property$/, '') : '';
  if (style && ptype && style.toLowerCase() !== ptype.toLowerCase()) {
    return `${style} (${ptype})`;
  }
  if (style) return style;
  if (ptype) return ptype;
  if (friendlyClass) return friendlyClass;
  return 'Unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mlsNumber } = req.query;
  if (!mlsNumber || typeof mlsNumber !== 'string') {
    return res.status(400).json({ error: 'mlsNumber required' });
  }

  if (!isRepliersConfigured()) {
    return res.status(503).json({ error: 'MLS data source not configured' });
  }

  try {
    const { data: l, isTestMode } = await getListingByMlsNumber(mlsNumber);
    if (!l || !l.mlsNumber) {
      return res.status(404).json({ error: 'Listing not found', mlsNumber, isTestMode });
    }

    const addr = l.address || {};
    const fullAddress = [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' ');
    const sqftRaw = (l as any).details?.sqft;
    const sqft = sqftRaw ? parseInt(String(sqftRaw).replace(/[^0-9]/g, ''), 10) || null : null;
    const lotWidth = (l as any).details?.lotWidth ?? null;
    const lotDepth = (l as any).details?.lotDepth ?? null;
    const lotArea = (l as any).details?.lotSizeFrontTimesDepth ?? null;
    const images: string[] = Array.isArray((l as any).images)
      ? (l as any).images.map((img: string) => buildRepliersImageUrl(img, 'large'))
      : [];

    const detail = {
      mlsNumber: l.mlsNumber,
      address: fullAddress || 'Address unavailable',
      unit: addr.unitNumber || null,
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      neighborhood: (addr as any).neighborhood || null,
      area: (addr as any).area || null,
      majorIntersection: (addr as any).majorIntersection || null,
      country: (addr as any).country || null,
      propertyType: buildPropertyTypeLabel(l),
      propertyStyle: (l as any).details?.style || null,
      propertyClass: (l as any).class || null,
      propertyTypeRaw: (l as any).details?.propertyType || null,
      bedrooms: (l as any).details?.numBedrooms ?? null,
      bathrooms: (l as any).details?.numBathrooms ?? null,
      bathroomsPlus: (l as any).details?.numBathroomsPlus ?? null,
      sqft,
      yearBuilt: (l as any).details?.yearBuilt ? parseInt((l as any).details.yearBuilt, 10) : null,
      garage: (l as any).details?.garage ?? null,
      lotWidth,
      lotDepth,
      lotArea,
      listPrice: l.listPrice || 0,
      soldPrice: l.soldPrice ?? null,
      daysOnMarket: l.daysOnMarket ?? null,
      status: l.status || '',
      lastStatus: l.lastStatus || '',
      lastStatusLabel: lastStatusLabel[l.lastStatus || ''] || l.lastStatus || '',
      listDate: l.listDate || null,
      soldDate: l.soldDate || null,
      latitude: (l as any).map?.latitude ?? null,
      longitude: (l as any).map?.longitude ?? null,
      streetViewUrl: (l as any).map?.streetViewUrl ?? null,
      description: (l as any).details?.description || null,
      images,
      raw: l,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ listing: detail, isTestMode, configured: true });
  } catch (err) {
    console.error('[listing detail] error:', err);
    return res.status(500).json({ error: 'Failed to fetch listing detail' });
  }
}

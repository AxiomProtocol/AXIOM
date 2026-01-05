import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

interface PropertyData {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  acreage?: number;
  askingPrice?: number;
  propertyType?: string;
  zoning?: string;
  description?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  sourceType?: string;
  sourceUrl?: string;
}

const ALLOWED_DOMAINS = [
  'zillow.com',
  'www.zillow.com',
  'realtor.com',
  'www.realtor.com',
  'redfin.com',
  'www.redfin.com',
  'loopnet.com',
  'www.loopnet.com',
  'landwatch.com',
  'www.landwatch.com',
  'lands.com',
  'www.lands.com',
  'landandfarm.com',
  'www.landandfarm.com'
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

function detectSource(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('zillow.com')) return 'zillow';
  if (lowerUrl.includes('realtor.com')) return 'realtor';
  if (lowerUrl.includes('redfin.com')) return 'redfin';
  if (lowerUrl.includes('loopnet.com')) return 'loopnet';
  if (lowerUrl.includes('landwatch.com')) return 'landwatch';
  if (lowerUrl.includes('lands.com')) return 'landwatch';
  if (lowerUrl.includes('landandfarm.com')) return 'landwatch';
  return 'other';
}

async function parsePropertyUrl(url: string): Promise<PropertyData> {
  if (!isAllowedUrl(url)) {
    throw new Error('URL must be from an approved property listing site (Zillow, Realtor, Redfin, LoopNet, or LandWatch)');
  }

  const sourceType = detectSource(url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    
    const extractedData: PropertyData = {
      sourceType,
      sourceUrl: url,
    };

    const addressMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
    if (addressMatch) {
      const titleText = addressMatch[1];
      const addressParts = titleText.split(/[,|]/);
      if (addressParts.length > 0) {
        extractedData.address = addressParts[0].trim();
      }
      if (addressParts.length > 1) {
        extractedData.city = addressParts[1]?.trim();
      }
    }

    const pricePatterns = [
      /\$([0-9,]+(?:\.[0-9]{2})?)/,
      /"price":\s*"?\$?([0-9,]+)"?/i,
      /data-price="([0-9,]+)"/i,
    ];
    
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        extractedData.askingPrice = parseFloat(priceStr);
        break;
      }
    }

    const acreagePatterns = [
      /([0-9,.]+)\s*(?:acres?|ac)/i,
      /"lotSize":\s*"?([0-9,.]+)/i,
      /lot[^:]*:\s*([0-9,.]+)\s*ac/i,
    ];
    
    for (const pattern of acreagePatterns) {
      const match = html.match(pattern);
      if (match) {
        extractedData.acreage = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    const latMatch = html.match(/"latitude":\s*(-?[0-9.]+)/);
    const lngMatch = html.match(/"longitude":\s*(-?[0-9.]+)/);
    if (latMatch) extractedData.latitude = parseFloat(latMatch[1]);
    if (lngMatch) extractedData.longitude = parseFloat(lngMatch[1]);

    const propertyTypePatterns = [
      /property\s*type[^:]*:\s*([^<,\n]+)/i,
      /"propertyType":\s*"([^"]+)"/i,
    ];
    
    for (const pattern of propertyTypePatterns) {
      const match = html.match(pattern);
      if (match) {
        extractedData.propertyType = match[1].trim();
        break;
      }
    }

    const imagePatterns = [
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi,
    ];
    
    const images: string[] = [];
    for (const pattern of imagePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && images.length < 5) {
        images.push(match[1]);
      }
    }
    if (images.length > 0) {
      extractedData.images = images;
    }

    return extractedData;
  } catch (error: any) {
    console.error('Error parsing property URL:', error);
    return {
      sourceType,
      sourceUrl: url,
    };
  }
}

function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { url, ownerName, ownerEmail, ownerPhone, notes } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'Property listing URL is required'
        });
      }

      if (!ownerEmail) {
        return res.status(400).json({
          success: false,
          error: 'Contact email is required'
        });
      }

      const extractedData = await parsePropertyUrl(url);
      
      const shareSlug = generateShareSlug();

      const result = await db.execute(sql`
        INSERT INTO land_submissions (
          owner_name, owner_email, owner_phone, property_address, city, state,
          zip_code, county, acreage, asking_price, property_type, zoning,
          latitude, longitude, source_url, source_type, import_status,
          imported_data, imported_at, images, notes, lead_score, status,
          approval_stage, share_slug, created_at
        ) VALUES (
          ${ownerName || 'Listing Import'},
          ${ownerEmail},
          ${ownerPhone || null},
          ${extractedData.address || 'Address from listing'},
          ${extractedData.city || null},
          ${extractedData.state || null},
          ${extractedData.zipCode || null},
          ${extractedData.county || null},
          ${extractedData.acreage || 0},
          ${extractedData.askingPrice || null},
          ${extractedData.propertyType || null},
          ${extractedData.zoning || null},
          ${extractedData.latitude || null},
          ${extractedData.longitude || null},
          ${url},
          ${extractedData.sourceType || 'other'},
          'parsed',
          ${JSON.stringify(extractedData)},
          NOW(),
          ${JSON.stringify(extractedData.images || [])},
          ${notes || null},
          50,
          'new',
          'submission',
          ${shareSlug},
          NOW()
        )
        RETURNING *
      `);

      const submission = result.rows[0];

      return res.status(201).json({
        success: true,
        data: {
          submission,
          extracted: extractedData,
          message: 'Property imported successfully! You can now edit the details before final submission.'
        }
      });
    } catch (error: any) {
      console.error('Error importing listing:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'URL parameter required for preview'
        });
      }

      const extractedData = await parsePropertyUrl(url);

      return res.status(200).json({
        success: true,
        data: {
          preview: extractedData,
          source: detectSource(url)
        }
      });
    } catch (error: any) {
      console.error('Error previewing listing:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

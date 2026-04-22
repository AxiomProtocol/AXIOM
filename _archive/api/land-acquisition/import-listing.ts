import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import puppeteer from 'puppeteer';

const ATTOM_API_KEY = process.env.ATTOM_API_KEY;

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

async function fetchAttomPropertyData(address: string, city: string, state: string): Promise<PropertyData | null> {
  if (!ATTOM_API_KEY || !address || !city) {
    return null;
  }

  try {
    const address1 = encodeURIComponent(address);
    const address2 = encodeURIComponent(`${city}, ${state}`);
    
    const response = await fetch(
      `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=${address1}&address2=${address2}`,
      {
        headers: {
          'accept': 'application/json',
          'apikey': ATTOM_API_KEY
        }
      }
    );

    if (!response.ok) {
      console.log('ATTOM API returned status:', response.status);
      return null;
    }

    const data = await response.json();
    const property = data?.property?.[0];
    
    if (!property) {
      return null;
    }

    const lot = property.lot || {};
    const building = property.building || {};
    const summary = building.summary || {};
    const assessment = property.assessment || {};
    const market = assessment.market || {};
    const location = property.location || {};
    const address_info = property.address || {};

    const attomData: PropertyData = {};

    if (lot.lotSize2) {
      attomData.acreage = parseFloat(lot.lotSize2);
    } else if (lot.lotSize1) {
      attomData.acreage = parseFloat(lot.lotSize1) / 43560;
    }

    if (market.mktTtlValue) {
      attomData.askingPrice = parseFloat(market.mktTtlValue);
    } else if (assessment.assessed?.assdTtlValue) {
      attomData.askingPrice = parseFloat(assessment.assessed.assdTtlValue);
    }

    if (summary.propType) {
      attomData.propertyType = summary.propType;
    }

    if (location.county) {
      attomData.county = location.county;
    }

    if (address_info.country) {
      attomData.latitude = property.location?.latitude;
      attomData.longitude = property.location?.longitude;
    }

    console.log('ATTOM data fetched:', attomData);
    return attomData;
  } catch (error: any) {
    console.error('ATTOM API error:', error.message);
    return null;
  }
}

function extractFromUrlPattern(url: string, sourceType: string): PropertyData {
  const data: PropertyData = {
    sourceType,
    sourceUrl: url,
  };

  try {
    if (sourceType === 'zillow') {
      const match = url.match(/homedetails\/([^/]+)\//);
      if (match) {
        const addressSlug = match[1];
        const parts = addressSlug.split('-');
        const stateIndex = parts.findIndex(p => p.length === 2 && /^[A-Z]{2}$/i.test(p));
        
        if (stateIndex > 0) {
          data.state = parts[stateIndex].toUpperCase();
          data.zipCode = parts[stateIndex + 1];
          data.city = parts[stateIndex - 1]?.replace(/-/g, ' ');
          data.address = parts.slice(0, stateIndex - 1).join(' ').replace(/-/g, ' ');
        } else {
          data.address = addressSlug.replace(/-/g, ' ');
        }
      }
    } else if (sourceType === 'realtor') {
      const match = url.match(/realestateandhomes-detail\/([^/]+)/);
      if (match) {
        data.address = match[1].replace(/_/g, ' ');
      }
    } else if (sourceType === 'landwatch' || url.includes('land')) {
      const match = url.match(/(\d+)-acres?/i);
      if (match) {
        data.acreage = parseFloat(match[1]);
      }
    }
  } catch (e) {
    console.error('Error extracting from URL pattern:', e);
  }

  return data;
}

async function parsePropertyUrl(url: string): Promise<PropertyData> {
  if (!isAllowedUrl(url)) {
    throw new Error('URL must be from an approved property listing site (Zillow, Realtor, Redfin, LoopNet, or LandWatch)');
  }

  const sourceType = detectSource(url);
  
  const extractedData = extractFromUrlPattern(url, sourceType);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/x205pbkd5xh5g4iv0g58xjla55has3cx-chromium-108.0.5359.94/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    if (response && response.ok()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pageData = await page.evaluate(() => {
        const data: any = {};
        
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const title = document.querySelector('title')?.textContent || '';
        const addressText = ogTitle || title;
        
        if (addressText && !addressText.includes('Access Denied') && !addressText.includes('Robot')) {
          const parts = addressText.split(/[,|]/);
          if (parts.length >= 2) {
            data.address = parts[0]?.trim();
            data.city = parts[1]?.trim();
            if (parts.length > 2) {
              const stateZip = parts[2]?.trim().split(' ');
              data.state = stateZip[0];
              data.zipCode = stateZip[1];
            }
          }
        }

        const bodyText = document.body?.innerText || '';
        
        const pricePatterns = [/\$([0-9,]+)/, /Price:\s*\$?([0-9,]+)/i];
        for (const pattern of pricePatterns) {
          const match = bodyText.match(pattern);
          if (match && !data.price) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (price > 1000) data.price = price;
          }
        }

        const acreMatch = bodyText.match(/([0-9,.]+)\s*(?:acres?|ac\b)/i);
        if (acreMatch) {
          data.acreage = parseFloat(acreMatch[1].replace(/,/g, ''));
        }

        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) data.image = ogImage;

        return data;
      });

      if (pageData.address) extractedData.address = pageData.address;
      if (pageData.city) extractedData.city = pageData.city;
      if (pageData.state) extractedData.state = pageData.state;
      if (pageData.zipCode) extractedData.zipCode = pageData.zipCode;
      if (pageData.price) extractedData.askingPrice = pageData.price;
      if (pageData.acreage) extractedData.acreage = pageData.acreage;
      if (pageData.image) extractedData.images = [pageData.image];
    }

    if (extractedData.address && extractedData.city && extractedData.state) {
      const attomData = await fetchAttomPropertyData(
        extractedData.address,
        extractedData.city,
        extractedData.state
      );
      if (attomData) {
        if (attomData.acreage && !extractedData.acreage) extractedData.acreage = attomData.acreage;
        if (attomData.askingPrice && !extractedData.askingPrice) extractedData.askingPrice = attomData.askingPrice;
        if (attomData.propertyType && !extractedData.propertyType) extractedData.propertyType = attomData.propertyType;
        if (attomData.county && !extractedData.county) extractedData.county = attomData.county;
        if (attomData.latitude) extractedData.latitude = attomData.latitude;
        if (attomData.longitude) extractedData.longitude = attomData.longitude;
      }
    }

    return extractedData;
  } catch (error: any) {
    console.error('Browser fetch failed, using URL extraction only:', error.message);
    
    if (extractedData.address && extractedData.city && extractedData.state) {
      try {
        const attomData = await fetchAttomPropertyData(
          extractedData.address,
          extractedData.city,
          extractedData.state
        );
        if (attomData) {
          if (attomData.acreage) extractedData.acreage = attomData.acreage;
          if (attomData.askingPrice) extractedData.askingPrice = attomData.askingPrice;
          if (attomData.propertyType) extractedData.propertyType = attomData.propertyType;
          if (attomData.county) extractedData.county = attomData.county;
          if (attomData.latitude) extractedData.latitude = attomData.latitude;
          if (attomData.longitude) extractedData.longitude = attomData.longitude;
        }
      } catch (attomError) {
        console.error('ATTOM fallback also failed:', attomError);
      }
    }
    
    return extractedData;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
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

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface ATTOMPropertyData {
  address?: {
    oneLine?: string;
    line1?: string;
    line2?: string;
    locality?: string;
    countrySubd?: string;
    postal1?: string;
  };
  lot?: {
    lotSize1?: number;
    lotSize2?: number;
    poolType?: string;
  };
  area?: {
    countrySecSubd?: string;
    subdName?: string;
    taxCodeArea?: string;
  };
  building?: {
    size?: {
      bldgSize?: number;
      grossSize?: number;
      livingSize?: number;
    };
    rooms?: {
      beds?: number;
      bathsFull?: number;
      bathsHalf?: number;
    };
    construction?: {
      condition?: string;
      foundationType?: string;
      roofCover?: string;
    };
  };
  assessment?: {
    assessed?: {
      assdTtlValue?: number;
      assdLandValue?: number;
      assdImprValue?: number;
    };
    market?: {
      mktTtlValue?: number;
      mktLandValue?: number;
      mktImprValue?: number;
    };
    tax?: {
      taxAmt?: number;
      taxYear?: number;
    };
  };
  vintage?: {
    lastModified?: string;
    pubDate?: string;
  };
}

async function fetchATTOMData(address: string, zipCode?: string): Promise<ATTOMPropertyData | null> {
  const apiKey = process.env.ATTOM_API_KEY;
  
  if (!apiKey) {
    console.log('ATTOM API key not configured');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = zipCode 
      ? `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address=${encodedAddress}&postalcode=${zipCode}`
      : `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address=${encodedAddress}`;

    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('ATTOM API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.property && data.property.length > 0) {
      return data.property[0];
    }

    return null;
  } catch (error) {
    console.error('ATTOM fetch error:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const candidateId = parseInt(id as string);

  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'Invalid candidate ID' });
  }

  if (req.method === 'GET') {
    try {
      const candidateResult = await pool.query(
        'SELECT * FROM land_candidates WHERE id = $1',
        [candidateId]
      );

      if (candidateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      const candidate = candidateResult.rows[0];
      
      if (candidate.public_records_data) {
        return res.status(200).json({
          success: true,
          data: candidate.public_records_data,
          source: 'cached',
          lastUpdated: candidate.public_records_updated_at
        });
      }

      return res.status(200).json({
        success: true,
        data: null,
        message: 'No public records data available. Use POST to fetch from ATTOM.'
      });
    } catch (error) {
      console.error('Public records fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch public records' });
    }
  }

  if (req.method === 'POST') {
    const { address, zipCode, forceRefresh } = req.body;

    try {
      const candidateResult = await pool.query(
        'SELECT * FROM land_candidates WHERE id = $1',
        [candidateId]
      );

      if (candidateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      const candidate = candidateResult.rows[0];

      if (candidate.public_records_data && !forceRefresh) {
        const lastUpdate = new Date(candidate.public_records_updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          return res.status(200).json({
            success: true,
            data: candidate.public_records_data,
            source: 'cached',
            message: 'Using cached data (less than 24 hours old)'
          });
        }
      }

      const searchAddress = address || candidate.location;
      
      if (!searchAddress) {
        return res.status(400).json({ success: false, error: 'Address required for public records lookup' });
      }

      const attomData = await fetchATTOMData(searchAddress, zipCode);

      if (!attomData) {
        return res.status(404).json({ 
          success: false, 
          error: 'No public records found for this address',
          message: 'ATTOM API returned no results. The address may not be in their database.'
        });
      }

      const publicRecords = {
        source: 'ATTOM',
        fetchedAt: new Date().toISOString(),
        address: attomData.address,
        lot: attomData.lot,
        area: attomData.area,
        building: attomData.building,
        assessment: attomData.assessment,
        vintage: attomData.vintage
      };

      await pool.query(
        `UPDATE land_candidates 
         SET public_records_data = $1, public_records_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(publicRecords), candidateId]
      );

      if (attomData.lot?.lotSize1 && !candidate.acreage) {
        const acreage = attomData.lot.lotSize1 / 43560;
        await pool.query(
          'UPDATE land_candidates SET acreage = $1 WHERE id = $2',
          [acreage.toFixed(2), candidateId]
        );
      }

      if (attomData.area?.countrySecSubd && !candidate.county) {
        await pool.query(
          'UPDATE land_candidates SET county = $1 WHERE id = $2',
          [attomData.area.countrySecSubd, candidateId]
        );
      }

      await pool.query(
        `INSERT INTO land_history (land_candidate_id, event_type, event_title, event_description, metadata)
         VALUES ($1, 'public_records_fetched', 'Public Records Retrieved', 'County assessor data fetched from ATTOM', $2)`,
        [candidateId, JSON.stringify({ source: 'ATTOM', address: searchAddress })]
      );

      return res.status(200).json({
        success: true,
        data: publicRecords,
        source: 'fresh',
        message: 'Public records fetched and cached successfully'
      });
    } catch (error) {
      console.error('Public records update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch public records' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

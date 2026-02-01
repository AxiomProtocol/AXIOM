import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const US_STATES = [
  { regionId: 'us-california', regionDisplay: 'California, USA', description: 'California community savings hub' },
  { regionId: 'us-texas', regionDisplay: 'Texas, USA', description: 'Texas community savings hub' },
  { regionId: 'us-florida', regionDisplay: 'Florida, USA', description: 'Florida community savings hub' },
  { regionId: 'us-new-york', regionDisplay: 'New York, USA', description: 'New York community savings hub' },
  { regionId: 'us-georgia', regionDisplay: 'Georgia, USA', description: 'Georgia community savings hub' },
  { regionId: 'us-illinois', regionDisplay: 'Illinois, USA', description: 'Illinois community savings hub' },
  { regionId: 'us-pennsylvania', regionDisplay: 'Pennsylvania, USA', description: 'Pennsylvania community savings hub' },
  { regionId: 'us-ohio', regionDisplay: 'Ohio, USA', description: 'Ohio community savings hub' },
  { regionId: 'us-north-carolina', regionDisplay: 'North Carolina, USA', description: 'North Carolina community savings hub' },
  { regionId: 'us-michigan', regionDisplay: 'Michigan, USA', description: 'Michigan community savings hub' },
  { regionId: 'us-new-jersey', regionDisplay: 'New Jersey, USA', description: 'New Jersey community savings hub' },
  { regionId: 'us-virginia', regionDisplay: 'Virginia, USA', description: 'Virginia community savings hub' },
  { regionId: 'us-washington', regionDisplay: 'Washington, USA', description: 'Washington community savings hub' },
  { regionId: 'us-arizona', regionDisplay: 'Arizona, USA', description: 'Arizona community savings hub' },
  { regionId: 'us-massachusetts', regionDisplay: 'Massachusetts, USA', description: 'Massachusetts community savings hub' },
  { regionId: 'us-tennessee', regionDisplay: 'Tennessee, USA', description: 'Tennessee community savings hub' },
  { regionId: 'us-maryland', regionDisplay: 'Maryland, USA', description: 'Maryland community savings hub' },
  { regionId: 'us-colorado', regionDisplay: 'Colorado, USA', description: 'Colorado community savings hub' },
  { regionId: 'us-minnesota', regionDisplay: 'Minnesota, USA', description: 'Minnesota community savings hub' },
  { regionId: 'us-nevada', regionDisplay: 'Nevada, USA', description: 'Nevada community savings hub' },
];

const CITIES = [
  { regionId: 'city-atlanta', regionDisplay: 'Atlanta, GA', description: 'Atlanta metro area savings hub' },
  { regionId: 'city-houston', regionDisplay: 'Houston, TX', description: 'Houston metro area savings hub' },
  { regionId: 'city-dallas', regionDisplay: 'Dallas, TX', description: 'Dallas metro area savings hub' },
  { regionId: 'city-los-angeles', regionDisplay: 'Los Angeles, CA', description: 'Los Angeles metro area savings hub' },
  { regionId: 'city-chicago', regionDisplay: 'Chicago, IL', description: 'Chicago metro area savings hub' },
  { regionId: 'city-miami', regionDisplay: 'Miami, FL', description: 'Miami metro area savings hub' },
  { regionId: 'city-new-york', regionDisplay: 'New York City, NY', description: 'New York City metro area savings hub' },
  { regionId: 'city-philadelphia', regionDisplay: 'Philadelphia, PA', description: 'Philadelphia metro area savings hub' },
  { regionId: 'city-phoenix', regionDisplay: 'Phoenix, AZ', description: 'Phoenix metro area savings hub' },
  { regionId: 'city-san-francisco', regionDisplay: 'San Francisco, CA', description: 'San Francisco Bay Area savings hub' },
  { regionId: 'city-seattle', regionDisplay: 'Seattle, WA', description: 'Seattle metro area savings hub' },
  { regionId: 'city-detroit', regionDisplay: 'Detroit, MI', description: 'Detroit metro area savings hub' },
  { regionId: 'city-charlotte', regionDisplay: 'Charlotte, NC', description: 'Charlotte metro area savings hub' },
  { regionId: 'city-washington-dc', regionDisplay: 'Washington, D.C.', description: 'Washington D.C. metro area savings hub' },
  { regionId: 'city-boston', regionDisplay: 'Boston, MA', description: 'Boston metro area savings hub' },
  { regionId: 'city-denver', regionDisplay: 'Denver, CO', description: 'Denver metro area savings hub' },
  { regionId: 'city-las-vegas', regionDisplay: 'Las Vegas, NV', description: 'Las Vegas metro area savings hub' },
  { regionId: 'city-memphis', regionDisplay: 'Memphis, TN', description: 'Memphis metro area savings hub' },
  { regionId: 'city-baltimore', regionDisplay: 'Baltimore, MD', description: 'Baltimore metro area savings hub' },
  { regionId: 'city-minneapolis', regionDisplay: 'Minneapolis, MN', description: 'Minneapolis metro area savings hub' },
];

const DIASPORA = [
  { regionId: 'diaspora-nigeria', regionDisplay: 'Nigeria (Diaspora)', description: 'Nigerian diaspora community savings hub' },
  { regionId: 'diaspora-ghana', regionDisplay: 'Ghana (Diaspora)', description: 'Ghanaian diaspora community savings hub' },
  { regionId: 'diaspora-jamaica', regionDisplay: 'Jamaica (Diaspora)', description: 'Jamaican diaspora community savings hub' },
  { regionId: 'diaspora-haiti', regionDisplay: 'Haiti (Diaspora)', description: 'Haitian diaspora community savings hub' },
  { regionId: 'diaspora-ethiopia', regionDisplay: 'Ethiopia (Diaspora)', description: 'Ethiopian diaspora community savings hub' },
  { regionId: 'diaspora-kenya', regionDisplay: 'Kenya (Diaspora)', description: 'Kenyan diaspora community savings hub' },
  { regionId: 'diaspora-south-africa', regionDisplay: 'South Africa (Diaspora)', description: 'South African diaspora community savings hub' },
  { regionId: 'diaspora-trinidad', regionDisplay: 'Trinidad & Tobago (Diaspora)', description: 'Trinidadian diaspora community savings hub' },
  { regionId: 'diaspora-guyana', regionDisplay: 'Guyana (Diaspora)', description: 'Guyanese diaspora community savings hub' },
  { regionId: 'diaspora-barbados', regionDisplay: 'Barbados (Diaspora)', description: 'Barbadian diaspora community savings hub' },
  { regionId: 'diaspora-mexico', regionDisplay: 'Mexico (Diaspora)', description: 'Mexican diaspora community savings hub' },
  { regionId: 'diaspora-philippines', regionDisplay: 'Philippines (Diaspora)', description: 'Filipino diaspora community savings hub' },
  { regionId: 'diaspora-india', regionDisplay: 'India (Diaspora)', description: 'Indian diaspora community savings hub' },
  { regionId: 'diaspora-vietnam', regionDisplay: 'Vietnam (Diaspora)', description: 'Vietnamese diaspora community savings hub' },
  { regionId: 'diaspora-el-salvador', regionDisplay: 'El Salvador (Diaspora)', description: 'Salvadoran diaspora community savings hub' },
  { regionId: 'diaspora-dominican-republic', regionDisplay: 'Dominican Republic (Diaspora)', description: 'Dominican diaspora community savings hub' },
  { regionId: 'diaspora-cuba', regionDisplay: 'Cuba (Diaspora)', description: 'Cuban diaspora community savings hub' },
  { regionId: 'diaspora-colombia', regionDisplay: 'Colombia (Diaspora)', description: 'Colombian diaspora community savings hub' },
  { regionId: 'diaspora-brazil', regionDisplay: 'Brazil (Diaspora)', description: 'Brazilian diaspora community savings hub' },
  { regionId: 'diaspora-cameroon', regionDisplay: 'Cameroon (Diaspora)', description: 'Cameroonian diaspora community savings hub' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM susu_interest_hubs');
    const count = parseInt(existingCount.rows[0]?.count || '0');

    if (count > 0) {
      return res.status(200).json({ 
        success: true, 
        message: `Hubs already seeded (${count} regions exist)`,
        count 
      });
    }

    let inserted = 0;

    for (const hub of US_STATES) {
      await pool.query(
        `INSERT INTO susu_interest_hubs (region_id, region_display, region_type, description, member_count, is_active, created_at, updated_at)
         VALUES ($1, $2, 'state', $3, 0, true, NOW(), NOW())
         ON CONFLICT (region_id) DO NOTHING`,
        [hub.regionId, hub.regionDisplay, hub.description]
      );
      inserted++;
    }

    for (const hub of CITIES) {
      await pool.query(
        `INSERT INTO susu_interest_hubs (region_id, region_display, region_type, description, member_count, is_active, created_at, updated_at)
         VALUES ($1, $2, 'city', $3, 0, true, NOW(), NOW())
         ON CONFLICT (region_id) DO NOTHING`,
        [hub.regionId, hub.regionDisplay, hub.description]
      );
      inserted++;
    }

    for (const hub of DIASPORA) {
      await pool.query(
        `INSERT INTO susu_interest_hubs (region_id, region_display, region_type, description, member_count, is_active, created_at, updated_at)
         VALUES ($1, $2, 'country', $3, 0, true, NOW(), NOW())
         ON CONFLICT (region_id) DO NOTHING`,
        [hub.regionId, hub.regionDisplay, hub.description]
      );
      inserted++;
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully seeded ${inserted} regions`,
      count: inserted 
    });
  } catch (error: any) {
    console.error('Error seeding hubs:', error);
    res.status(500).json({ error: error.message || 'Failed to seed hubs' });
  }
}

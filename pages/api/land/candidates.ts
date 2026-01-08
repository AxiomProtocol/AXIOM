import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreate(req, res);
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const candidates = await db.execute(sql`
      SELECT 
        id,
        name,
        location,
        county,
        state,
        acreage,
        asking_price,
        property_type,
        stage,
        stewardship_intent,
        public_summary,
        featured_image_url,
        due_diligence_progress,
        is_access_verified,
        is_title_reviewed,
        is_survey_verified,
        is_environmental_screened
      FROM land_candidates
      WHERE stage != 'archived'
      ORDER BY created_at DESC
    `);

    const visibleStages = ['candidate', 'under_review', 'due_diligence', 'ready_for_vote', 'approved_for_execution', 'acquired'];

    const filteredCandidates = candidates.rows.filter((c: any) => 
      visibleStages.includes(c.stage || 'candidate')
    );

    return res.status(200).json({
      success: true,
      data: filteredCandidates.map((c: any) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        county: c.county,
        state: c.state,
        acreage: c.acreage?.toString(),
        askingPrice: c.asking_price?.toString(),
        propertyType: c.property_type,
        stage: c.stage,
        stewardshipIntent: c.stewardship_intent,
        publicSummary: c.public_summary,
        featuredImageUrl: c.featured_image_url,
        dueDiligenceProgress: c.due_diligence_progress,
        isAccessVerified: c.is_access_verified,
        isTitleReviewed: c.is_title_reviewed,
        isSurveyVerified: c.is_survey_verified,
        isEnvironmentalScreened: c.is_environmental_screened
      }))
    });
  } catch (error) {
    console.error('Land candidates fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch land candidates' });
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      location,
      county,
      state,
      acreage,
      askingPrice,
      propertyType,
      stage = 'candidate',
      stewardshipIntent,
      publicSummary,
      featuredImageUrl,
      listingUrl
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO land_candidates (
        name, location, county, state, acreage, asking_price, property_type,
        stage, stewardship_intent, public_summary, featured_image_url, listing_url,
        due_diligence_progress, is_access_verified, is_title_reviewed, 
        is_survey_verified, is_environmental_screened, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, false, false, false, false, NOW(), NOW()
      ) RETURNING *`,
      [
        name,
        location || null,
        county || null,
        state || null,
        acreage ? parseFloat(acreage) : null,
        askingPrice ? parseFloat(askingPrice) : null,
        propertyType || 'agricultural',
        stage,
        stewardshipIntent || null,
        publicSummary || null,
        featuredImageUrl || null,
        listingUrl || null
      ]
    );

    const c = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        location: c.location,
        county: c.county,
        state: c.state,
        acreage: c.acreage?.toString(),
        askingPrice: c.asking_price?.toString(),
        propertyType: c.property_type,
        stage: c.stage,
        stewardshipIntent: c.stewardship_intent,
        publicSummary: c.public_summary,
        featuredImageUrl: c.featured_image_url,
        listingUrl: c.listing_url,
        dueDiligenceProgress: c.due_diligence_progress,
        isAccessVerified: c.is_access_verified,
        isTitleReviewed: c.is_title_reviewed,
        isSurveyVerified: c.is_survey_verified,
        isEnvironmentalScreened: c.is_environmental_screened,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }
    });
  } catch (error) {
    console.error('Land candidate create error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create land candidate' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const stageLabels: Record<string, string> = {
  candidate: 'Candidate',
  under_review: 'Under Review',
  due_diligence: 'Due Diligence',
  ready_for_vote: 'Ready for Vote',
  approved_for_execution: 'Approved for Execution',
  acquired: 'Acquired',
  archived: 'Archived'
};

async function sendStageChangeNotification(candidateId: number, oldStage: string, newStage: string, candidateName: string) {
  if (oldStage === newStage) return;
  
  try {
    console.log(`Land candidate ${candidateId} (${candidateName}) stage changed: ${stageLabels[oldStage] || oldStage} → ${stageLabels[newStage] || newStage}`);
    
    await pool.query(
      `INSERT INTO system_audit_logs (action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'stage_change',
        'land_candidate',
        candidateId,
        JSON.stringify({ oldStage, newStage, candidateName, timestamp: new Date().toISOString() })
      ]
    );

    const adminResult = await pool.query(
      `SELECT email FROM admin_users WHERE role IN ('super_admin', 'admin') AND is_active = true LIMIT 5`
    );
    
    if (adminResult.rows.length > 0) {
      try {
        const { sendAdminNewSubmissionAlert } = await import('../../../../lib/server/resendEmail');
        for (const admin of adminResult.rows) {
          await sendAdminNewSubmissionAlert({
            adminEmail: admin.email,
            ownerName: 'System',
            propertyAddress: candidateName,
            acreage: 0,
            leadScore: 0,
            submissionId: candidateId
          });
        }
      } catch (emailError) {
        console.log('Email notification skipped (Resend not configured):', emailError);
      }
    }
  } catch (error) {
    console.error('Failed to log stage change:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'ID must be a number' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT * FROM land_candidates WHERE id = $1',
        [candidateId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      const c = result.rows[0];
      return res.status(200).json({
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
      console.error('Land candidate fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch land candidate' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const {
        name,
        location,
        county,
        state,
        acreage,
        askingPrice,
        propertyType,
        stage,
        stewardshipIntent,
        publicSummary,
        featuredImageUrl,
        listingUrl,
        dueDiligenceProgress,
        isAccessVerified,
        isTitleReviewed,
        isSurveyVerified,
        isEnvironmentalScreened
      } = req.body;

      let oldStage: string | null = null;
      let candidateName: string | null = null;
      
      if (stage !== undefined) {
        const existingResult = await pool.query(
          'SELECT stage, name FROM land_candidates WHERE id = $1',
          [candidateId]
        );
        if (existingResult.rows.length > 0) {
          oldStage = existingResult.rows[0].stage;
          candidateName = existingResult.rows[0].name;
        }
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (location !== undefined) {
        updates.push(`location = $${paramIndex++}`);
        values.push(location);
      }
      if (county !== undefined) {
        updates.push(`county = $${paramIndex++}`);
        values.push(county);
      }
      if (state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(state);
      }
      if (acreage !== undefined) {
        updates.push(`acreage = $${paramIndex++}`);
        values.push(parseFloat(acreage) || 0);
      }
      if (askingPrice !== undefined) {
        updates.push(`asking_price = $${paramIndex++}`);
        values.push(parseFloat(askingPrice) || 0);
      }
      if (propertyType !== undefined) {
        updates.push(`property_type = $${paramIndex++}`);
        values.push(propertyType);
      }
      if (stage !== undefined) {
        updates.push(`stage = $${paramIndex++}`);
        values.push(stage);
      }
      if (stewardshipIntent !== undefined) {
        updates.push(`stewardship_intent = $${paramIndex++}`);
        values.push(stewardshipIntent);
      }
      if (publicSummary !== undefined) {
        updates.push(`public_summary = $${paramIndex++}`);
        values.push(publicSummary);
      }
      if (featuredImageUrl !== undefined) {
        updates.push(`featured_image_url = $${paramIndex++}`);
        values.push(featuredImageUrl);
      }
      if (listingUrl !== undefined) {
        updates.push(`listing_url = $${paramIndex++}`);
        values.push(listingUrl);
      }
      if (dueDiligenceProgress !== undefined) {
        updates.push(`due_diligence_progress = $${paramIndex++}`);
        values.push(parseInt(dueDiligenceProgress) || 0);
      }
      if (isAccessVerified !== undefined) {
        updates.push(`is_access_verified = $${paramIndex++}`);
        values.push(Boolean(isAccessVerified));
      }
      if (isTitleReviewed !== undefined) {
        updates.push(`is_title_reviewed = $${paramIndex++}`);
        values.push(Boolean(isTitleReviewed));
      }
      if (isSurveyVerified !== undefined) {
        updates.push(`is_survey_verified = $${paramIndex++}`);
        values.push(Boolean(isSurveyVerified));
      }
      if (isEnvironmentalScreened !== undefined) {
        updates.push(`is_environmental_screened = $${paramIndex++}`);
        values.push(Boolean(isEnvironmentalScreened));
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(candidateId);

      const query = `
        UPDATE land_candidates 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      const c = result.rows[0];
      
      if (oldStage && stage && oldStage !== stage) {
        await sendStageChangeNotification(candidateId, oldStage, stage, candidateName || c.name);
      }
      
      return res.status(200).json({
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
      console.error('Land candidate update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update land candidate' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(
        `UPDATE land_candidates 
         SET stage = 'archived', archived_at = NOW(), archived_reason = 'Deleted by admin'
         WHERE id = $1
         RETURNING id`,
        [candidateId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      return res.status(200).json({ success: true, message: 'Land candidate archived' });
    } catch (error) {
      console.error('Land candidate delete error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete land candidate' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

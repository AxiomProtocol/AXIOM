import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { 
  sendLandSubmissionNotification, 
  sendLandStatusUpdateEmail,
  sendAdminNewSubmissionAlert 
} from '../../../lib/server/resendEmail';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@axiom.city';

function calculateLeadScore(data: any): number {
  let score = 0;
  
  if (data.acreage >= 100) score += 25;
  else if (data.acreage >= 50) score += 20;
  else if (data.acreage >= 20) score += 15;
  else if (data.acreage >= 10) score += 10;
  else score += 5;
  
  if (data.titleClear) score += 15;
  if (data.openToOption) score += 10;
  if (data.roadAccess === 'paved' || data.roadAccess === 'public') score += 10;
  else if (data.roadAccess === 'gravel' || data.roadAccess === 'dirt') score += 5;
  
  const utilities = data.utilitiesAvailable || {};
  if (utilities.electric) score += 5;
  if (utilities.water) score += 5;
  if (utilities.sewer) score += 5;
  if (utilities.gas) score += 3;
  if (utilities.internet) score += 2;
  
  if (data.zoning === 'agricultural' || data.zoning === 'mixed-use') score += 10;
  else if (data.zoning === 'residential' || data.zoning === 'commercial') score += 8;
  
  if (data.timelineToSell === 'immediate' || data.timelineToSell === '1-3 months') score += 10;
  else if (data.timelineToSell === '3-6 months') score += 5;
  
  return Math.min(score, 100);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, minAcreage, state, sortBy = 'created_at', order = 'desc' } = req.query;

      let result;
      
      if (status && minAcreage && state) {
        result = await db.execute(sql`
          SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
          FROM land_submissions ls
          LEFT JOIN users u ON ls.assigned_steward_id = u.id
          WHERE ls.status = ${String(status)} 
            AND ls.acreage >= ${Number(minAcreage)}
            AND ls.state = ${String(state)}
          ORDER BY ls.created_at DESC
        `);
      } else if (status && minAcreage) {
        result = await db.execute(sql`
          SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
          FROM land_submissions ls
          LEFT JOIN users u ON ls.assigned_steward_id = u.id
          WHERE ls.status = ${String(status)} AND ls.acreage >= ${Number(minAcreage)}
          ORDER BY ls.created_at DESC
        `);
      } else if (status) {
        result = await db.execute(sql`
          SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
          FROM land_submissions ls
          LEFT JOIN users u ON ls.assigned_steward_id = u.id
          WHERE ls.status = ${String(status)}
          ORDER BY ls.created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
          FROM land_submissions ls
          LEFT JOIN users u ON ls.assigned_steward_id = u.id
          ORDER BY ls.created_at DESC
        `);
      }

      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing_count,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          AVG(acreage) as avg_acreage,
          SUM(acreage) as total_acreage,
          AVG(lead_score) as avg_lead_score
        FROM land_submissions
      `);

      return res.status(200).json({
        success: true,
        data: {
          submissions: result.rows || [],
          stats: stats.rows[0] || {}
        }
      });
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyAddress,
        city,
        state,
        zipCode,
        county,
        parcelNumber,
        acreage,
        askingPrice,
        zoning,
        propertyType,
        currentUse,
        utilitiesAvailable,
        roadAccess,
        waterSource,
        topography,
        structuresOnProperty,
        environmentalIssues,
        titleClear,
        liensEncumbrances,
        ownerMotivation,
        timelineToSell,
        openToOption,
        optionPremiumAcceptable,
        notes
      } = req.body;

      if (!ownerName || !ownerEmail || !propertyAddress || !acreage) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: ownerName, ownerEmail, propertyAddress, acreage'
        });
      }

      const parsedAcreage = parseFloat(String(acreage));
      if (isNaN(parsedAcreage) || parsedAcreage < 1) {
        return res.status(400).json({
          success: false,
          error: 'Acreage must be a valid number of at least 1 acre'
        });
      }

      const leadScore = calculateLeadScore({
        acreage: parsedAcreage,
        titleClear,
        openToOption,
        roadAccess,
        utilitiesAvailable,
        zoning,
        timelineToSell
      });

      const result = await db.execute(sql`
        INSERT INTO land_submissions (
          owner_name, owner_email, owner_phone, property_address, city, state,
          zip_code, county, parcel_number, acreage, asking_price, zoning,
          property_type, current_use, utilities_available, road_access,
          water_source, topography, structures_on_property, environmental_issues,
          title_clear, liens_encumbrances, owner_motivation, timeline_to_sell,
          open_to_option, option_premium_acceptable, notes, lead_score, status, created_at
        ) VALUES (
          ${ownerName}, ${ownerEmail}, ${ownerPhone || null}, ${propertyAddress},
          ${city || null}, ${state || null}, ${zipCode || null}, ${county || null},
          ${parcelNumber || null}, ${parsedAcreage}, ${askingPrice || null}, ${zoning || null},
          ${propertyType || null}, ${currentUse || null}, 
          ${JSON.stringify(utilitiesAvailable || {})}, ${roadAccess || null},
          ${waterSource || null}, ${topography || null}, ${structuresOnProperty || null},
          ${environmentalIssues || null}, ${titleClear !== false}, ${liensEncumbrances || null},
          ${ownerMotivation || null}, ${timelineToSell || null}, ${openToOption !== false},
          ${optionPremiumAcceptable || null}, ${notes || null}, ${leadScore}, 'new', NOW()
        )
        RETURNING *
      `);

      const submission = result.rows[0] as any;

      sendLandSubmissionNotification({
        ownerEmail,
        ownerName,
        propertyAddress,
        acreage: parsedAcreage,
        leadScore
      }).catch(err => console.error('Failed to send owner notification:', err));

      sendAdminNewSubmissionAlert({
        adminEmail: ADMIN_EMAIL,
        ownerName,
        propertyAddress,
        acreage: parsedAcreage,
        leadScore,
        submissionId: submission.id
      }).catch(err => console.error('Failed to send admin alert:', err));

      return res.status(201).json({
        success: true,
        data: {
          submission,
          leadScore,
          message: 'Property submission received! Our team will review it within 48 hours.'
        }
      });
    } catch (error: any) {
      console.error('Error creating submission:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, status, assignedStewardId, reviewedBy, notes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Submission ID required' });
      }

      const updates: string[] = ['updated_at = NOW()'];
      
      if (status) {
        const validStatuses = ['new', 'reviewing', 'qualified', 'approved', 'rejected', 'archived'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ success: false, error: 'Invalid status' });
        }
      }

      const result = await db.execute(sql`
        UPDATE land_submissions
        SET status = COALESCE(${status || null}, status),
            assigned_steward_id = COALESCE(${assignedStewardId || null}, assigned_steward_id),
            reviewed_by = COALESCE(${reviewedBy || null}, reviewed_by),
            reviewed_at = CASE WHEN ${status} IN ('approved', 'rejected') THEN NOW() ELSE reviewed_at END,
            notes = COALESCE(${notes || null}, notes),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      const updatedSubmission = result.rows[0] as any;

      if (status && ['reviewing', 'qualified', 'approved', 'rejected'].includes(status)) {
        sendLandStatusUpdateEmail({
          ownerEmail: updatedSubmission.owner_email,
          ownerName: updatedSubmission.owner_name,
          propertyAddress: updatedSubmission.property_address,
          newStatus: status
        }).catch(err => console.error('Failed to send status update email:', err));
      }

      return res.status(200).json({
        success: true,
        data: {
          submission: updatedSubmission,
          message: `Submission updated to status: ${status || 'unchanged'}`
        }
      });
    } catch (error: any) {
      console.error('Error updating submission:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { landOptionId } = req.query;

    if (!landOptionId) {
      return res.status(400).json({ error: 'Land option ID required' });
    }

    try {
      const result = await pool.query(`
        SELECT 
          ddr.*,
          lo.location,
          lo.acreage,
          lo.property_type,
          prep.wallet_address as prepared_by_name,
          appr.wallet_address as approved_by_name
        FROM due_diligence_reports ddr
        LEFT JOIN land_options lo ON ddr.land_option_id = lo.id
        LEFT JOIN users prep ON ddr.prepared_by = prep.id
        LEFT JOIN users appr ON ddr.approved_by = appr.id
        WHERE ddr.land_option_id = $1
        ORDER BY ddr.created_at DESC
        LIMIT 1
      `, [landOptionId]);

      if (!result.rows[0]) {
        return res.status(200).json({ success: true, data: null });
      }

      const report = result.rows[0];
      res.status(200).json({
        success: true,
        data: {
          id: report.id,
          reportType: report.report_type,
          status: report.status,
          location: report.location,
          acreage: report.acreage,
          propertyType: report.property_type,
          titleSearch: {
            completed: report.title_search_completed,
            date: report.title_search_date,
            findings: report.title_search_findings,
            company: report.title_company,
          },
          environmental: {
            completed: report.environmental_assessment_completed,
            date: report.environmental_date,
            findings: report.environmental_findings,
            rating: report.environmental_rating,
          },
          survey: {
            completed: report.survey_completed,
            date: report.survey_date,
            findings: report.survey_findings,
            surveyor: report.surveyor_name,
          },
          comparableSales: report.comparable_sales || [],
          marketAnalysis: report.market_analysis,
          estimatedValue: report.estimated_value,
          scores: {
            walk: report.walk_score,
            transit: report.transit_score,
            bike: report.bike_score,
          },
          zoning: report.zoning,
          zoningRestrictions: report.zoning_restrictions,
          utilities: report.utilities || {},
          legalIssues: report.legal_issues,
          riskAssessment: report.risk_assessment,
          riskScore: report.risk_score,
          recommendations: report.recommendations,
          preparedBy: report.prepared_by_name,
          approvedBy: report.approved_by_name,
          approvedAt: report.approved_at,
          createdAt: report.created_at,
        },
      });
    } catch (error) {
      console.error('Due diligence fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { landOptionId, reportType } = req.body;

    if (!landOptionId) {
      return res.status(400).json({ error: 'Land option ID required' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO due_diligence_reports (land_option_id, report_type, prepared_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [landOptionId, reportType || 'full', userId]);

      res.status(201).json({
        success: true,
        data: { reportId: result.rows[0].id },
      });
    } catch (error) {
      console.error('Due diligence create error:', error);
      res.status(500).json({ error: 'Failed to create report' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

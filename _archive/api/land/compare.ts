import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { ids } = req.query;

  if (!ids) {
    return res.status(400).json({ success: false, error: 'Property IDs required (comma-separated)' });
  }

  const idList = (ids as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

  if (idList.length < 2 || idList.length > 3) {
    return res.status(400).json({ success: false, error: 'Please provide 2-3 property IDs for comparison' });
  }

  try {
    const result = await pool.query(
      `SELECT lc.*, 
        (SELECT COUNT(*) FROM land_checklist_items WHERE land_candidate_id = lc.id AND is_completed = true) as completed_tasks,
        (SELECT COUNT(*) FROM land_checklist_items WHERE land_candidate_id = lc.id) as total_tasks,
        (SELECT COUNT(*) FROM land_comments WHERE land_candidate_id = lc.id AND is_deleted = false) as comment_count
       FROM land_candidates lc
       WHERE lc.id = ANY($1)`,
      [idList]
    );

    if (result.rows.length < 2) {
      return res.status(404).json({ success: false, error: 'One or more properties not found' });
    }

    const properties = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      county: row.county,
      state: row.state,
      acreage: row.acreage ? parseFloat(row.acreage) : null,
      askingPrice: row.asking_price ? parseFloat(row.asking_price) : null,
      pricePerAcre: row.acreage && row.asking_price ? Math.round(parseFloat(row.asking_price) / parseFloat(row.acreage)) : null,
      propertyType: row.property_type,
      stage: row.stage,
      stewardshipIntent: row.stewardship_intent,
      publicSummary: row.public_summary,
      featuredImageUrl: row.featured_image_url,
      parcelNumber: row.parcel_number,
      zoning: row.zoning,
      waterAccess: row.water_access,
      roadFrontage: row.road_frontage,
      topography: row.topography,
      soilType: row.soil_type,
      dueDiligence: {
        completedTasks: parseInt(row.completed_tasks),
        totalTasks: parseInt(row.total_tasks),
        progress: row.total_tasks > 0 ? Math.round((parseInt(row.completed_tasks) / parseInt(row.total_tasks)) * 100) : 0
      },
      commentCount: parseInt(row.comment_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    const stageLabels: Record<string, string> = {
      candidate: 'Candidate',
      under_review: 'Under Review',
      due_diligence: 'Due Diligence',
      ready_for_vote: 'Ready for Vote',
      approved_for_execution: 'Approved',
      acquired: 'Acquired',
      archived: 'Archived'
    };

    const comparisonFields: Array<{ key: string; label: string; format: (v: any) => string }> = [
      { key: 'acreage', label: 'Acreage', format: (v) => v ? `${v.toLocaleString()} acres` : 'N/A' },
      { key: 'askingPrice', label: 'Asking Price', format: (v) => v ? `$${v.toLocaleString()}` : 'TBD' },
      { key: 'pricePerAcre', label: 'Price per Acre', format: (v) => v ? `$${v.toLocaleString()}` : 'N/A' },
      { key: 'propertyType', label: 'Property Type', format: (v) => v || 'N/A' },
      { key: 'stage', label: 'Stage', format: (v) => stageLabels[v] || v },
      { key: 'county', label: 'County', format: (v) => v || 'N/A' },
      { key: 'zoning', label: 'Zoning', format: (v) => v || 'N/A' },
      { key: 'waterAccess', label: 'Water Access', format: (v) => typeof v === 'string' ? v : (v ? 'Yes' : 'Unknown') },
      { key: 'roadFrontage', label: 'Road Frontage', format: (v) => typeof v === 'string' ? v : (v ? 'Yes' : 'Unknown') },
    ];

    const comparison = comparisonFields.map(field => ({
      field: field.label,
      values: properties.map(p => field.format((p as Record<string, any>)[field.key]))
    }));

    return res.status(200).json({
      success: true,
      data: {
        properties,
        comparison,
        summary: {
          propertyCount: properties.length,
          totalAcreage: properties.reduce((sum, p) => sum + (p.acreage || 0), 0),
          totalValue: properties.reduce((sum, p) => sum + (p.askingPrice || 0), 0),
          avgPricePerAcre: Math.round(
            properties.reduce((sum, p) => sum + (p.pricePerAcre || 0), 0) / properties.filter(p => p.pricePerAcre).length
          ) || 0
        }
      }
    });
  } catch (error) {
    console.error('Comparison fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch comparison data' });
  }
}

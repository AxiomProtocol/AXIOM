import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [
      totalClaimsResult,
      verifiedClaimsResult,
      activeDisclosuresResult,
      totalComplaintsResult,
      resolvedComplaintsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM compliance_claims WHERE is_public = true'),
      pool.query("SELECT COUNT(*) FROM compliance_claims WHERE is_public = true AND status = 'verified'"),
      pool.query('SELECT COUNT(*) FROM compliance_disclosures WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM compliance_complaints'),
      pool.query("SELECT COUNT(*) FROM compliance_complaints WHERE status = 'resolved'")
    ]);

    const totalClaims = parseInt(totalClaimsResult.rows[0]?.count || '0');
    const verifiedClaims = parseInt(verifiedClaimsResult.rows[0]?.count || '0');
    const activeDisclosures = parseInt(activeDisclosuresResult.rows[0]?.count || '0');
    const totalComplaints = parseInt(totalComplaintsResult.rows[0]?.count || '0');
    const resolvedComplaints = parseInt(resolvedComplaintsResult.rows[0]?.count || '0');

    return res.status(200).json({
      claims: {
        total: totalClaims,
        verified: verifiedClaims,
      },
      disclosures: {
        active: activeDisclosures,
      },
      complaints: {
        total: totalComplaints,
        resolved: resolvedComplaints,
        resolutionRate: totalComplaints ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    return res.status(500).json({ error: 'Failed to fetch compliance stats' });
  }
}

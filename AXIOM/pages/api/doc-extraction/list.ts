import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { dealId, propertyId, walletAddress } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (dealId) {
      params.push(dealId);
      conditions.push(`deal_id = $${params.length}`);
    }
    if (propertyId) {
      params.push(propertyId);
      conditions.push(`property_id = $${params.length}`);
    }
    if (walletAddress) {
      params.push(walletAddress);
      conditions.push(`wallet_address = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, deal_id, property_id, doc_type, status, original_filename,
              mime_type, file_size_bytes, confidence, field_count, applied_to_deal,
              processing_time_ms, error_message, created_at, updated_at
       FROM doc_extractions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    return res.status(200).json({
      success: true,
      extractions: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('[doc-extraction] List error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list extractions',
    });
  }
}

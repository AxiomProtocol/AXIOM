import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM doc_extractions WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Extraction not found' });
      }

      const fields = await pool.query(
        `SELECT * FROM doc_extraction_fields WHERE extraction_id = $1 ORDER BY field_name`,
        [id]
      );

      return res.status(200).json({
        success: true,
        extraction: result.rows[0],
        fields: fields.rows,
      });
    } catch (error: any) {
      console.error('[doc-extraction] Get error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { status, appliedToDeal } = req.body;

      if (status === 'verified') {
        await pool.query(
          `UPDATE doc_extractions SET status = 'verified', updated_at = now() WHERE id = $1`,
          [id]
        );
      }

      if (appliedToDeal !== undefined) {
        await pool.query(
          `UPDATE doc_extractions SET applied_to_deal = $1, updated_at = now() WHERE id = $2`,
          [appliedToDeal, id]
        );
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[doc-extraction] Patch error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM doc_extraction_fields WHERE extraction_id = $1`, [id]);
      await pool.query(`DELETE FROM doc_extractions WHERE id = $1`, [id]);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[doc-extraction] Delete error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { operatorId } = req.body;

  if (!operatorId) {
    return res.status(400).json({ message: 'operatorId is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT status FROM node_operators WHERE operator_id = $1',
        [operatorId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Operator not found' });
      }

      if (checkResult.rows[0].status === 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot reject an active operator' });
      }

      await client.query(
        `UPDATE node_operators 
         SET status = 'REJECTED', onboarding_phase = 'REJECTED', updated_at = NOW()
         WHERE operator_id = $1`,
        [operatorId]
      );

      await client.query(
        `UPDATE node_onboarding 
         SET current_phase = 'REJECTED', updated_at = NOW()
         WHERE operator_id = $1`,
        [operatorId]
      );

      await client.query('COMMIT');

      res.status(200).json({ 
        success: true, 
        message: 'Operator application rejected',
        operatorId
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error rejecting operator:', error);
    res.status(500).json({ message: 'Failed to reject operator' });
  }
}
